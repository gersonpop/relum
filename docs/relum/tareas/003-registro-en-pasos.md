# Tarea 003 — Registro en pasos con etiquetas

Estado: terminada · Agente: Codex · Orquestador: Claude

## Objetivo

El formulario de registro inicial (`web/src/app/[locale]/onboarding/OnboardingClient.tsx`) usa solo
textos de ayuda dentro de los campos («DNI / Identificación», «Nombres», «Código», «Teléfono»…) que
desaparecen al escribir. Usuarios no técnicos se pierden. Hay que hacerlo claro y por pasos.

## Principio de diseño (esencia de Relum)

Relum debe ser **ultraintuitiva, simple, funcional pero moderna**. Ante la duda: menos elementos,
textos más cortos y claros, una acción principal evidente por pantalla. Estética limpia y actual
(espaciado generoso, bordes redondeados, transiciones suaves y discretas), sin adornos que distraigan.
Debe sentirse como una app moderna, no como un sistema administrativo antiguo.

## Qué construir

1. **Etiquetas visibles** (`<label htmlFor>`) encima de cada campo, en español claro. Cambia
   «DNI / Identificación» por «Número de documento». Los textos de ayuda pueden quedarse como ejemplo
   («Ej.: 1020304050»). Marca los campos obligatorios con «(obligatorio)» en texto, no solo con asterisco.
2. **Pasos:** agrupa los campos en 2 o 3 pasos con sentido (por ejemplo: «Tus datos», «Contacto»,
   «Tu empresa» — adapta según los campos reales). Muestra arriba «Paso 1 de 3 · Tus datos» y una barra
   de progreso. Botones «Atrás» y «Siguiente» con texto; en el último paso, el botón de enviar actual.
3. **Validación por paso:** no se avanza si faltan obligatorios del paso. El mensaje de error aparece
   debajo del campo (`aria-describedby`, `aria-invalid`) y el foco va al primer campo con error.
4. Estados de carga/error del envío con el siguiente paso claro («No pudimos guardar tus datos.
   Revisa tu conexión e inténtalo de nuevo.»).
5. Mantén **exactamente** la misma información enviada al servidor y la misma lógica de envío.
6. Textos nuevos en `web/messages/es.json`, `en.json` y `fr.json` bajo una clave nueva
   `"onboardingSteps"` (no edites otras claves; otros agentes editan esos archivos al mismo tiempo, así
   que haz cambios pequeños y puntuales). Si el archivo hoy tiene textos fijos en el código, puedes
   dejarlos así o moverlos a esa clave.

## No tocar

- Ningún archivo fuera de `OnboardingClient.tsx`, `onboarding/page.tsx` (solo si es necesario) y
  `web/messages/*.json` (solo la clave nueva).
- Rutas de la API ni la lógica de servidor.

## Criterios de aceptación

- `./node_modules/.bin/tsc --noEmit -p .` sin errores (desde `web/`).
- Sin nuevos errores de lint en los archivos tocados.
- Los tres JSON de mensajes siguen siendo válidos.
- Funciona en 375 px de ancho.
- No hagas commit. No corras `npm run build` (el sandbox no tiene red; lo corre el orquestador).

## Resultado

Implementado por Codex (`gpt-6.2-sol`); resumen del agente en `003-registro-en-pasos.resultado.md`.
Tres pasos: «Tus datos», «Contacto», «Tu empresa», con etiquetas visibles, validación por paso y
reintento si falla el envío. Lo enviado al servidor no cambia.

Verificación común del orquestador (2026-11-22), tareas 002–004 juntas:
- `tsc --noEmit` sin errores y `next build` completo exitoso.
- Lint: ningún archivo tocado empeora (varios bajan: roles 16→14, registro 1→0…); `components/ui` sin errores.
- Los tres JSON de mensajes son válidos; ninguna llamada al servidor cambió en el diff.
- No se probó en el navegador: la página exige una sesión real (la sesión de desarrollo no aplica)
  y redirige al inicio de sesión. Pendiente probarla en producción con una cuenta nueva.
