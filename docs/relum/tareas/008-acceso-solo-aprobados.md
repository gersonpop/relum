# Tarea 008 — Solo entran a la app los usuarios registrados y aprobados

Estado: en curso · Agente: Codex · Orquestador: Claude

## Objetivo

El flujo esperado es: el usuario entra con Google o Microsoft → completa el registro (`/onboarding`:
datos y empresa) → queda pendiente (`/pending-approval`) → un administrador lo aprueba desde la app →
recién entonces puede usar Relum.

Hoy ese control **solo existe en tres pantallas**: `(protect)/home/page.tsx`, `(protect)/scrum/page.tsx`
y `(protect)/setting/layout.tsx` (usan `resolveLoginNavigation`). Las demás secciones protegidas
(`users`, `companies`, `dashboard`, `workflow`) solo exigen tener sesión, a través de
`resolveUserContext` en `web/src/lib/server-session-helper.ts`. Con la barra de pestañas del celular, un
usuario recién llegado puede abrir esas secciones sin registrarse ni ser aprobado.

## Qué construir

1. **Un solo punto de control para todas las pantallas protegidas.**
   - Crea `web/src/app/[locale]/(protect)/layout.tsx` (o usa el mecanismo que corresponda en esta
     versión de Next.js; lee `web/AGENTS.md` y `node_modules/next/dist/docs/`) que, para cualquier ruta
     dentro de `(protect)`, obtenga la sesión y llame a `resolveSocialOnboarding(email, provider)` de
     `web/src/server/auth/onboarding.ts`:
     - `ACTIVE` → continúa.
     - `FORM_REQUIRED` o `PROVIDER_CONFLICT` → `redirect(/{locale}/onboarding)`.
     - `PENDING_ONLY` → `redirect(/{locale}/pending-approval)`.
     - Usuario con estado `inactive` en `PlatformUser` (hoy devuelve `FORM_REQUIRED`): no debe volver a
       llenar el registro; envíalo a `/pending-approval` con un mensaje claro en español de cuenta
       desactivada («Tu cuenta está desactivada. Pide a un administrador de tu empresa que la active.»).
       Agrega el flujo que haga falta en `resolveSocialOnboarding` sin romper los existentes.
   - Aplica la misma verificación dentro de `resolveUserContext`, para que cualquier página que lo use
     quede protegida aunque se renderice en paralelo con el layout.
   - Quita las verificaciones duplicadas de `home`, `scrum` y `setting/layout.tsx` (deben depender del
     punto central).
   - La sesión falsa de desarrollo (`DEV_FAKE_SESSION`, solo en `development`) sigue funcionando y se
     considera `ACTIVE`.
2. **Lo mismo en la API.** En `web/src/server/api-auth.ts`, `requireApiActor` y `requireSessionUser`
   deben responder **403** con mensaje en español si el usuario de la sesión no está `ACTIVE`.
   Excepciones necesarias para que el registro funcione: las rutas que usa la página `/onboarding`
   (envío, cancelación y catálogos de países/empresas/etc.). Revisa qué rutas llama `OnboardingClient`
   y deja solo esas abiertas a usuarios no aprobados; documenta la lista en el resultado.
   `requireSuperUser` no cambia de comportamiento salvo exigir también `ACTIVE`.
3. **Rendimiento.** Hoy `resolveSocialOnboarding` llama a `ensureUserStatusCatalog()` en cada consulta.
   Si esa función escribe en la base, haz que se ejecute una sola vez por proceso (memoriza la promesa).
   La verificación por petición debe ser solo lecturas.
4. Textos nuevos en `web/messages/{es,en,fr}.json` bajo una clave nueva `"accessGate"`.

## No tocar

- La lógica de cifrado de permisos (`hash_permission`) ni el callback `jwt` de `auth-options.ts` salvo lo
  mínimo imprescindible.
- Datos de la base: **no ejecutes nada contra la base de producción**.

## Criterios de aceptación

- `./node_modules/.bin/tsc --noEmit -p .` sin errores (desde `web/`); sin nuevos errores de lint.
- Ninguna ruta dentro de `(protect)` se puede ver sin estar `ACTIVE` (explica en el resultado cómo lo
  comprobaste, por ejemplo con una prueba o simulando `resolveSocialOnboarding`).
- La API responde 403 a usuarios no activos fuera de las rutas del registro.
- No hagas commit. No corras `npm run build` (lo corre el orquestador).
