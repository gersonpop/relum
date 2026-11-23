# Tarea 001 — Healthcheck de la app

Estado: terminada · Agente: Codex · Orquestador: Claude

## Objetivo

Crear un endpoint de salud para que Coolify sepa si la app está realmente funcionando
(hoy Coolify muestra "Running (no healthcheck)").

## Qué construir

1. `web/src/app/api/health/route.ts` con `GET`:
   - Sin sesión (es público), pero **sin exponer datos sensibles**: ni versiones, ni nombres de tablas,
     ni mensajes de error internos, ni variables de entorno.
   - Hace `SELECT 1` a PostgreSQL usando `getPgPool()` de `web/src/server/postgres.ts`, con un tiempo
     máximo de ~3 segundos.
   - Responde `200` con `{"status":"ok","database":"ok"}` si la base responde.
   - Responde `503` con `{"status":"error","database":"error"}` si la base no responde o tarda demasiado.
   - Cabecera `Cache-Control: no-store`.
   - Debe ser dinámica (no prerenderizada en el build).
2. Asegúrate de que el middleware de next-intl (`web/middleware.ts`) **no** intercepte `/api/health`
   (revisa el `matcher`; las rutas `/api` ya deberían estar excluidas — confírmalo).
3. En `web/Dockerfile`, etapa `runner`, agrega un `HEALTHCHECK` de Docker que llame a
   `http://127.0.0.1:3000/api/health` usando **node** (la imagen alpine no trae curl), por ejemplo con
   `node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`.
   Intervalo 30s, timeout 5s, start-period 30s, 3 reintentos.

## No tocar

- `web/src/server/api-auth.ts`, autenticación, otras rutas de la API.
- Nada fuera de `web/` salvo este archivo de tarea.

## Criterios de aceptación

- `./node_modules/.bin/tsc --noEmit -p .` sin errores (desde `web/`).
- `npm run build` exitoso y `/api/health` aparece como ruta dinámica (ƒ).
- Sin nuevos errores de lint en los archivos tocados.
- No hagas commit.

## Resultado

Implementado por Codex (`gpt-6.2-sol`); resumen del agente en `001-healthcheck.resultado.md`.

Verificación del orquestador (2026-11-22):
- Diff revisado: solo `web/src/app/api/health/route.ts` (nuevo) y `HEALTHCHECK` en `web/Dockerfile`.
- `tsc --noEmit` y lint de la ruta: sin errores.
- `next build` completo (con red): exitoso, `/api/health` aparece como ruta dinámica (ƒ).
- Servidor standalone con base de datos inaccesible: responde `503 {"status":"error","database":"error"}`
  con `Cache-Control: no-store`, sin detalles internos.
- Producción (despliegue 6ae7112): `GET /api/health` → `200 {"status":"ok","database":"ok"}` con la base
  real, y Coolify pasó de "Running (no healthcheck)" a "Running".

Nota: el sandbox de Codex no tiene red, así que no puede descargar Google Fonts para el build;
el build completo lo corre siempre el orquestador.
