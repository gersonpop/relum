# Tarea 011 — Cancelar el registro no guarda nada en «Onboarding»

Estado: terminada · Agente: Codex · Orquestador: Claude

## Regla del producto (definida por el usuario)

Una solicitud de registro **solo existe en `"Onboarding"` si el usuario completa y envía el
formulario**. Si cancela, no queda ninguna solicitud (ni pendiente ni fallida) ni datos personales del
borrador.

## Situación actual

`cancelSocialOnboarding` en `web/src/server/auth/onboarding.ts` (llamada desde
`POST /api/v1/auth/social/onboarding/cancel`, botón «Cancelar» de `OnboardingClient.tsx`) inserta o
actualiza una fila en `"Onboarding"` con `status = 'failed'` y guarda lo que el usuario había escrito
(nombres, documento, fecha de nacimiento, etc.). También hay un comentario que indica que el diálogo
de documento duplicado «envía el borrador al cancelar». Así nacieron solicitudes «fallidas» como la de
«Gerson Porras / LinkedIn».

## Qué construir

1. `cancelSocialOnboarding`: **no** inserta ni actualiza filas de `"Onboarding"`. Solo registra el evento
   en `"AuditLog"` (acción `cancel-onboarding`, `actorId` = correo, metadata con red, ip, navegador y
   geolocalización que ya recibe; **sin** datos del formulario: ni nombres, ni documento, ni fecha de
   nacimiento, ni teléfono).
   - Si ya existe una solicitud vigente (`pending_approval`/`active`), cancelar no la toca (como hoy).
   - Simplifica la firma/entrada (`OnboardingCancelInput`) y la ruta `cancel/route.ts` para no recibir ni
     reenviar los datos del formulario.
2. `OnboardingClient.tsx`: al cancelar (botón «Cancelar» y el diálogo de documento duplicado), no envíes
   el borrador; llama al endpoint de cancelación solo para dejar la traza y luego cierra sesión y vuelve
   al inicio como hoy. Si la llamada falla, igual cierra sesión (no dejar al usuario atrapado).
3. Revisa que nada más en el código cree filas `failed` (busca `"failed"` en `web/src`). El estado
   `failed` puede seguir existiendo en el catálogo para datos viejos, pero la app ya no debe crearlo.
4. Si hace falta, ajusta los textos en `web/messages/{es,en,fr}.json` (por ejemplo, que el diálogo de
   cancelar no diga que se guardará el borrador).

## No tocar

- `submitSocialOnboarding` y la lógica de la tarea 010, salvo lo imprescindible.
- El control de acceso de la tarea 008.
- **No ejecutes nada contra la base de producción.** Las filas `failed` heredadas se limpiarán aparte.

## Criterios de aceptación

- `./node_modules/.bin/tsc --noEmit -p .` sin errores (desde `web/`); sin nuevos errores de lint.
- Cancelar no produce ningún `INSERT`/`UPDATE` en `"Onboarding"` (explica cómo lo comprobaste).
- No hagas commit. No corras `npm run build`.

## Resultado

Implementado por Codex; resumen en `011-cancelar-registro-sin-guardar.resultado.md`.

Verificación del orquestador (2026-11-23):
- Diff revisado: `cancelSocialOnboarding` solo inserta en `"AuditLog"` (`cancel-onboarding`, correo, red, ip,
  navegador, geolocalización; sin datos del formulario). La ruta ya no lee el cuerpo de la petición.
  El cliente cierra sesión aunque falle la cancelación. El panel y la API de administración ya no permiten
  asignar el estado `failed` (se conserva para solicitudes históricas).
- `tsc --noEmit` sin errores, `next build` exitoso, lint sin errores nuevos.
- Pendiente: probar en producción «Cancelar» con una sesión real.
