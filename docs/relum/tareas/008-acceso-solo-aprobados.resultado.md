Implementé la tarea 008 en `main`. Todas las pantallas protegidas comprueban que la cuenta esté `ACTIVE` antes de cargar datos. Las cuentas nuevas van al registro, las pendientes van a `/pending-approval` y las desactivadas reciben allí un mensaje específico. La sesión simulada sigue disponible solo en desarrollo. [Control de acceso a pantallas](web/src/lib/server-session-helper.ts)

La API devuelve `403` en español a las cuentas no activas. Para quienes deben completar el registro, las únicas excepciones bajo `/api/v1/auth/social/onboarding/` son:

- `GET` para `bootstrap`, `departments`, `cities` y `roles`.
- `POST` para `submit`, `cancel` y `avatar`.

**Verificación.** Pasaron `tsc --noEmit`, `git diff --check` y una simulación de las 18 páginas y layouts protegidos, `/pending-users` y los controles de la API. ESLint no detectó incidencias nuevas en los archivos modificados. Queda pendiente probar el flujo con OAuth y almacenamiento reales. No ejecuté el build, no usé la base de producción y no hice commit.