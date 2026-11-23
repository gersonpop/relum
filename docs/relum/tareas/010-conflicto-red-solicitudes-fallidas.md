# Tarea 010 — Una solicitud fallida o cancelada no debe bloquear el registro con otra red

Estado: terminada · Agente: Codex · Orquestador: Claude

## Problema (visto en producción)

El usuario entra con **Microsoft** (`gersonpop@hotmail.com`). No existe en `"PlatformUser"`. En
`"Onboarding"` hay una solicitud heredada con ese correo: «Gerson Porras», `provider = linkedin`,
`status = failed`. Resultado: `/onboarding` muestra el modal «Registro existente — tu correo ya está
registrado en Relum con la red social LinkedIn» y el botón «Ir a iniciar sesión» lo saca de la app.
No puede registrarse nunca.

Causa: `resolveSocialOnboarding` en `web/src/server/auth/onboarding.ts` toma **cualquier** fila de
`"Onboarding"` con ese correo (`LIMIT 1`, sin orden) y si la red es distinta devuelve
`PROVIDER_CONFLICT`, aunque la solicitud esté `failed`. Además, un correo puede tener varias filas
(la unicidad es `email + companyId`), así que el resultado depende de qué fila salga primero.

## Qué construir

1. En `resolveSocialOnboarding` (rama de `"Onboarding"`):
   - Solo las solicitudes **vigentes** cuentan para conflicto de red y para el flujo: `pending_approval`
     (y `active` si existe en esa tabla). Las `failed`, `inactive`/canceladas o desconocidas se ignoran
     para el conflicto: el usuario debe poder registrarse con la red que usa ahora (`FORM_REQUIRED`).
   - Si hay varias filas, elige de forma determinista: primero `pending_approval`, luego la más
     reciente (`updated_at`/`created_at`).
   - La rama de `"PlatformUser"` (usuario ya dado de alta) no cambia: ahí sí es conflicto real usar otra
     red.
2. En `submitSocialOnboarding` (y `cancelSocialOnboarding` si aplica): que enviar el registro con la red
   nueva funcione aunque existan filas viejas `failed` con el mismo correo — por ejemplo, actualizando
   la fila vieja de la misma empresa o creando una nueva sin chocar con la unicidad `(email, companyId)`.
   Revisa también la consulta `existingResult` (`LIMIT 1` sin orden) para que use el mismo criterio
   determinista. Las comprobaciones de documento duplicado (`country_code` + `dni`) deben ignorar
   también las solicitudes `failed`.
3. Modal de conflicto en `OnboardingClient.tsx` (solo se verá ya en conflictos reales con
   `"PlatformUser"`): el texto debe decir qué hacer, en español claro, p. ej. «Ya tienes una cuenta en
   Relum con LinkedIn. Cierra sesión y entra con LinkedIn.» y el botón «Cerrar sesión y volver al
   inicio» (hoy dice «Ir a iniciar sesión»). Textos en `web/messages/{es,en,fr}.json`.
4. Si es razonable, una prueba pequeña (o simulación documentada en el resultado) de los casos:
   solo `failed` con otra red → `FORM_REQUIRED`; `pending_approval` con otra red → `PROVIDER_CONFLICT`;
   `pending_approval` misma red → `PENDING_ONLY`; varias filas → elige la vigente.

## No tocar

- El control de acceso de la tarea 008 (`requireActivePageSession`, `api-auth.ts`) salvo que sea
  imprescindible.
- **No ejecutes nada contra la base de producción.**

## Criterios de aceptación

- `./node_modules/.bin/tsc --noEmit -p .` sin errores (desde `web/`); sin nuevos errores de lint.
- No hagas commit. No corras `npm run build`.

## Resultado

Implementado por Codex; resumen en `010-conflicto-red-solicitudes-fallidas.resultado.md`.

Verificación del orquestador (2026-11-23):
- Diff revisado: solo cuentan solicitudes `pending_approval`/`active` (orden determinista); el envío va en
  transacción con bloqueo por correo y por documento; una solicitud `failed` que ocupe el mismo
  documento en la misma empresa guarda el valor en `metadata.releasedDni` y deja `dni` vacío.
- Esquema real de producción consultado (solo lectura): únicos `id`, `(email, companyId)` y
  `(dni, country_code, companyId)`; `dni` admite nulos; `metadata` es `jsonb`. Compatible con el
  cambio. El código anterior usaba `ON CONFLICT ("email")`, que no existe en producción: enviar el
  registro habría fallado; queda corregido.
- `tsc --noEmit` sin errores, `next build` exitoso, lint sin errores nuevos, JSON válidos.
- Pendiente: probar en producción con `gersonpop@hotmail.com` (Microsoft) el registro completo.
