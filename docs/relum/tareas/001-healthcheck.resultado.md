Implementé el healthcheck de Relum. No hice commit.

- [route.ts](< /Users/gersonpop/Documents/Proyectos/Proyecto Gestion OT/web/src/app/api/health/route.ts>) agrega `GET /api/health` como ruta pública y dinámica. Consulta PostgreSQL con `SELECT 1` y devuelve `200` si responde o `503` si falla o supera los 3 segundos. Ambas respuestas llevan `Cache-Control: no-store` y omiten detalles internos.
- [Dockerfile](</Users/gersonpop/Documents/Proyectos/Proyecto Gestion OT/web/Dockerfile>) ejecuta la sonda con Node cada 30 segundos, con 5 segundos de espera máxima, 30 segundos de gracia inicial y 3 reintentos.

**Verificación.** Pasaron `tsc` y ESLint de la ruta. Confirmé que el middleware excluye `/api/health` y que, con PostgreSQL simulado, la ruta devuelve `200`, `503` y responde al vencer el plazo. `npm run build -- --webpack` pasó con fuentes locales y listó `ƒ /api/health`.

**Pendiente.** El `npm run build` estándar quedó bloqueado por el acceso a Google Fonts y la restricción de puertos locales de Turbopack. Queda por probar la sonda en un contenedor con PostgreSQL real.