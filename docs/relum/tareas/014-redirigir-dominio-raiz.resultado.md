Implementé la redirección temporal **HTTP 307** de `datafy.site` y `www.datafy.site` a `https://relum.datafy.site`. Conserva la ruta y los parámetros de consulta. `localhost` y `relum.187.53.107.149.sslip.io` quedan excluidos. Si la ruta termina en `/`, Next.js aplica primero su 308 habitual para retirar esa barra.

**Archivos cambiados**

- [web/next.config.ts](</Users/gersonpop/Documents/Proyectos/Proyecto Gestion OT/web/next.config.ts>) incorpora la regla por dominio. Next.js lee `RELUM_CANONICAL_HOST` y `RELUM_REDIRECT_HOSTS` durante el build de producción. Cambiar sus valores requiere un nuevo build.
- [Resultado de la tarea 014](</Users/gersonpop/Documents/Proyectos/Proyecto Gestion OT/docs/relum/tareas/014-redirigir-dominio-raiz.resultado.md>) registra la implementación y las verificaciones.

**Verificación.** Pasaron TypeScript, ESLint del archivo y `git diff --check`. También comprobé el 307, la ruta, los parámetros repetidos, los dominios excluidos y la configuración personalizada con las utilidades de Next.js. La búsqueda en `web/src`, `web/public` y `web/messages` no encontró direcciones que actualizar.

**Pendiente.** Verificar los dos dominios con peticiones HTTP en producción después del despliegue. Según la tarea, no ejecuté el build ni hice commit.