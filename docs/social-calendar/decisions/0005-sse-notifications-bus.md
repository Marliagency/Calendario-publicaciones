# 0005 — Bus de notificaciones SSE in-memory

- **Fecha**: 2026-05-19
- **Estado**: Aceptada
- **Decisores**: Claude (a partir del §2.7 del brief)

## Contexto

La PWA tiene que enterarse en tiempo real cuando llega una pieza nueva del Estudio
Creativo (badge, sidebar de pendientes). El brief lo lista como crítico: "auto-refresh
cada 30s o suscripción WebSocket/SSE para que las piezas nuevas del estudio aparezcan
sin recargar".

## Decisión

SSE (`/sse/notifications`) con bus in-memory basado en `EventEmitter` para Fase 2.

- Heartbeat cada 25s para sobrevivir a proxies que cortan idle.
- Cada evento se persiste también en `NotificationDelivery` para que la PWA pueda
  reconstruir histórico al abrirse en frío.
- Auth: el endpoint requiere usuario admin (cookie httpOnly).

## Por qué SSE y no WebSocket

- One-way (servidor → cliente) basta. La PWA hace REST para acciones (aprobar,
  rechazar). No hay nada que justifique full-duplex.
- SSE atraviesa proxies HTTP/1.1 sin handshake especial.
- Reconexión automática gestionada por el navegador (`EventSource`).
- Cero dependencias extra; el endpoint es Fastify + raw response.

## Por qué in-memory y no Redis pub/sub

- ADR 0001 fija single-server. Un EventEmitter es suficiente.
- Cuando escale (multi-instancia), sustituir el bus por Redis pub/sub sin tocar
  rutas. La interfaz `subscribe(listener) → unsubscribe` permanece igual.

## Consecuencias

- Pros: cero infraestructura adicional, latencia mínima, código trivial.
- Cons: si reiniciamos el API, las suscripciones se pierden; la PWA reconecta sola
  pero pierde los eventos emitidos durante la caída. Mitigación: cuando la PWA
  reconecta, primero pide `GET /api/v1/notifications/unread-count` y muestra
  badge desde DB.
