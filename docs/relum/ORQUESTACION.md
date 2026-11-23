# Cómo se trabaja en Relum: orquestador + agentes Codex

Desde el 2026-11-22 el trabajo se reparte así:

- **Claude (orquestador):** entiende lo que pide el usuario, lo divide en tareas pequeñas, escribe el
  brief de cada una, lanza agentes Codex, **verifica** lo que entregan, hace commit/push y despliega.
  Solo implementa directamente lo que Codex no puede hacer.
- **Codex (agentes ejecutores):** implementan cada tarea en el código siguiendo `AGENTS.md`.

## Qué hace cada uno

| Codex | Claude (orquestador) |
|---|---|
| Código de `web/` (páginas, API, componentes, estilos, textos) | Dividir el trabajo y escribir los briefs |
| Migraciones SQL y scripts | Revisar el diff, correr tipos/build/pruebas, probar en navegador |
| Pruebas y correcciones de lint | Commit, push y despliegue en Coolify |
| Documentación técnica de lo que implementa | Infraestructura: Coolify, VPS, DNS, Hostinger |
| | Paneles con sesión del usuario: Google Cloud, Microsoft Entra, GitHub |
| | Cualquier paso con secretos (siempre los escribe el usuario) |
| | Actualizar `docs/relum/ESTADO.md` y este registro |

## Ciclo de una tarea

1. **Brief:** el orquestador crea `docs/relum/tareas/NNN-nombre.md` con: objetivo, contexto, archivos
   relevantes, criterios de aceptación y qué NO tocar.
2. **Lanzar:** se ejecuta Codex sin interacción, en la raíz del repo, sobre `main`:
   ```bash
   CODEX="/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex"
   "$CODEX" exec -m gpt-6.2-sol -C "<raíz del repo>" -s workspace-write \
     -o docs/relum/tareas/NNN-nombre.resultado.md \
     "Lee AGENTS.md y docs/relum/tareas/NNN-nombre.md y realiza la tarea. No hagas commit."
   ```
   El modelo se pasa con `-m`: el de `~/.codex/config.toml` (`gpt-5.5`) no está permitido para cuentas de
   ChatGPT en la CLI. Modelos disponibles: ver `~/.codex/models_cache.json`.
   Varias tareas independientes pueden correr en paralelo **solo si no tocan los mismos archivos**.
   Si pueden chocar, se lanzan una tras otra.
3. **Verificar (orquestador):**
   - Leer el diff completo (`git diff`).
   - `tsc --noEmit`, `npm run build`, lint de los archivos tocados.
   - Probar en el navegador o con peticiones reales lo que se pueda.
   - Revisar seguridad (rutas de API con `requireApiActor`/`requireSessionUser`) y textos en español.
   - Si algo falla: se devuelve a Codex con las observaciones (`codex exec resume --last ...`) o se corrige.
4. **Cerrar:** commit en `main` con mensaje descriptivo, push, despliegue si aplica, y anotar el resultado
   en el archivo de la tarea y en `ESTADO.md`.

## Registro de tareas

| # | Tarea | Agente | Estado | Commit |
|---|---|---|---|---|
| 001 | Healthcheck de la app (`/api/health`) | Codex | terminada, verificada y en producción | 6ae7112 |
| 002 | Menú móvil | Codex + ajuste del orquestador | terminada, verificada y en producción | d50b34d |
| 003 | Registro en pasos con etiquetas | Codex | en producción; falta prueba con sesión real | d50b34d |
| 004 | Diálogos accesibles, confirmaciones y acciones con texto | Codex | terminada, verificada y en producción | d50b34d |
| 005 | Armazón de app móvil (barra inferior, PWA) | Codex | terminada, verificada y en producción | a8e9d88 |
| 006 | Secciones con pestañas en el celular | Codex + ajustes del orquestador | terminada, verificada y en producción | a8e9d88 |
| 007 | Inicio de sesión como app móvil | Codex | terminada, verificada y en producción | a8e9d88 |

## Lecciones aprendidas

- El sandbox de Codex (`workspace-write`) no tiene red: no puede descargar Google Fonts ni instalar
  paquetes. El orquestador corre el `next build` completo y cualquier `npm install`.
- Tres agentes Codex pueden editar `messages/*.json` a la vez si cada uno usa su propia clave y hace
  cambios puntuales (tareas 002–004 sin conflictos).
- Para probar pantallas protegidas en local: `DEV_FAKE_SESSION=true` en `web/.env.local`. No sirve para
  `/onboarding`, que exige sesión real.
- Si el panel del navegador de pruebas está oculto, el navegador pausa transiciones y animaciones:
  el foco o los efectos animados pueden parecer rotos sin estarlo.
