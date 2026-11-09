# CLAUDE.md

Las instrucciones del proyecto están en `AGENTS.md` (las comparten Claude Code y Codex). Se
importan aquí:

@AGENTS.md

## Solo para Claude Code

- Las skills del equipo están en `.claude/skills/` y se cargan solas: `test-unitario`,
  `test-integracion`, `test-e2e`, `nueva-funcionalidad` y `revisar-codigo`. Úsalas para la tarea
  que corresponda (ver `AGENTS.md` §2).
- Si tienes instalados plugins o skills de terceros (por ejemplo, los de Neon), no los uses para
  cambiar la arquitectura ni las herramientas del proyecto (ver `AGENTS.md` §7, regla 8).
- Tus ajustes personales van en `.claude/settings.local.json`, que git ignora.
