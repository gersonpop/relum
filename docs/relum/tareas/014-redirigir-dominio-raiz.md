# Tarea 014 — `datafy.site` redirige a `relum.datafy.site`

Estado: terminada · Agente: Codex · Orquestador: Claude

## Contexto

Relum tendrá una sola dirección: `https://relum.datafy.site` (decisión del usuario, 2026-11-23). El
orquestador ya creó el DNS y agregó el dominio en Coolify, y `NEXTAUTH_URL` pasa a
`https://relum.datafy.site`. Los dominios `datafy.site` y `www.datafy.site` siguen llegando a la misma
app. Coolify no permite redirigir un dominio hacia otro, así que la redirección la hace la app.

## Qué construir

1. En `web/next.config.ts`, agrega `redirects()` por host:
   - Si el host es `datafy.site` o `www.datafy.site`, redirige a `https://relum.datafy.site` con la
     misma ruta y los mismos parámetros.
   - Usa una redirección temporal (307/308 no permanente) por ahora, para poder cambiarla luego.
   - Respeta las redirecciones existentes, si las hay. Lee `web/AGENTS.md` y la documentación de Next 16
     en `node_modules/next/dist/docs/` para la sintaxis de `has: [{ type: "host", ... }]`.
2. Haz el dominio de destino configurable con una variable opcional `RELUM_CANONICAL_HOST`
   (por defecto `relum.datafy.site`). Los hosts que se redirigen salen de
   `RELUM_REDIRECT_HOSTS` (por defecto `datafy.site,www.datafy.site`).
   - Si `next.config.ts` lee estas variables durante el build, explícalo en el resultado. En Coolify las
     variables están disponibles en el build.
3. Que `localhost` y `relum.187.53.107.149.sslip.io` **no** se redirijan.
4. Busca en `web/src`, `web/public` y `web/messages` direcciones fijas a `datafy.site` (sin `relum.`),
   y cámbialas si corresponde. No cambies nada de NextAuth.

## No tocar

- Infraestructura, apps OAuth, base de datos.

## Criterios de aceptación

- `./node_modules/.bin/tsc --noEmit -p .` sin errores (desde `web/`); sin nuevos errores de lint.
- No hagas commit. No corras `npm run build`.

## Resultado

Implementado por Codex; resumen en `014-redirigir-dominio-raiz.resultado.md`.

Verificación del orquestador (2026-11-23): diff revisado (solo `redirects()` en `next.config.ts`, 307 con ruta
y parámetros); `tsc --noEmit` sin errores, lint sin errores, `next build` exitoso.
Infraestructura hecha por el orquestador: registro A `relum` en Hostinger, dominio `relum.datafy.site` en
Coolify, `NEXTAUTH_URL=https://relum.datafy.site`, origen y retorno en Google y retorno en Microsoft.
