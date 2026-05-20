import { EventEmitter } from 'node:events';
import { type Prisma, prisma } from '@qyro/db';

export type NotificationEvent = {
  workspaceId: string;
} & (
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
    }
);

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
          workspaceId: event.workspaceId,
          channelKind: 'PUSH',
          event: event.kind,
          payloadJson: event.data as unknown as Prisma.InputJsonValue,
          deliveredAt: new Date(),
        },
      });
    } catch (err) {
      console.error('NotificationBus: fallo al persistir delivery', err);
    }
  }
}

export const notificationBus = new NotificationBus();
