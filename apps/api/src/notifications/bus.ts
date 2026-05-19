import { EventEmitter } from 'node:events';
import { type Prisma, prisma } from '@qyro/db';

/**
 * Bus de eventos in-memory para SSE.
 *
 * Decisión consciente: el sistema es single-tenant + single-server (ADR 0001), así que
 * un EventEmitter basta. Si en el futuro escala a multi-server, sustituir por Redis
 * pub/sub sin tocar las rutas (`subscribe`/`emitEvent`).
 *
 * Cada evento se persiste también en `NotificationDelivery` para que la PWA pueda
 * mostrar histórico aunque haya estado cerrada.
 */
export type NotificationEvent =
  | {
      kind: 'content-piece.ingested';
      data: {
        contentPieceId: string;
        externalRef: string;
        title: string;
        format: string;
        previewMediaUrl: string | null;
        suggestedSchedule: Record<string, string | undefined> | null;
      };
    }
  | {
      kind: 'content-piece.status-changed';
      data: { contentPieceId: string; from: string; to: string };
    };

class NotificationBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  subscribe(listener: (event: NotificationEvent) => void): () => void {
    this.emitter.on('event', listener);
    return () => this.emitter.off('event', listener);
  }

  async emitEvent(event: NotificationEvent): Promise<void> {
    this.emitter.emit('event', event);
    try {
      await prisma.notificationDelivery.create({
        data: {
          channelKind: 'PUSH',
          event: event.kind,
          payloadJson: event.data as unknown as Prisma.InputJsonValue,
          deliveredAt: new Date(),
        },
      });
    } catch (err) {
      // Persistir el delivery no debe bloquear el evento en vivo. Loguea y sigue.
      console.error('NotificationBus: fallo al persistir delivery', err);
    }
  }
}

export const notificationBus = new NotificationBus();
