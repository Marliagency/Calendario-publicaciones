# Social Calendar — Documentación

## Índice

- [Arquitectura](architecture.md) — visión de conjunto, flujo de datos, decisiones macro.
- [Conectar nueva cuenta social](connect-new-account.md) — OAuth con Meta/TikTok paso a paso.
- [Añadir nueva red](add-new-platform.md) — cómo implementar un nuevo `SocialPublisher`.
- [Extender el checklist de QC](extend-qc-checklist.md) — añadir reglas configurables.
- [Integración con el Estudio Creativo (SESIÓN 2)](creative-studio-integration.md) — contrato HTTP que consume el estudio para empujar piezas al calendario.
- [Decisiones arquitectónicas (ADRs)](decisions/) — registro inmutable de decisiones.

## Plan por fases

Estado actualizado en [`/CLAUDE.md`](../../CLAUDE.md#8-plan-por-fases-estado-actual).

## Onboarding rápido para nuevos chats

1. Lee `/CLAUDE.md` entero (es la fuente de verdad).
2. Mira esta carpeta `/docs/social-calendar/`.
3. `git log --oneline -20` para contexto histórico.
4. Propón siguiente paso antes de tocar código.
