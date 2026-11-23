# Tarea 002 — Menú móvil

Estado: terminada · Agente: Codex · Orquestador: Claude

## Objetivo

Que la app se pueda usar en un celular (375 px de ancho). Hoy la barra lateral de
`web/src/components/protected-sidebar-layout.tsx` siempre ocupa espacio (`const hidden = false;`) y en
pantallas pequeñas deja muy poco lugar al contenido.

## Principio de diseño (esencia de Relum)

Relum debe ser **ultraintuitiva, simple, funcional pero moderna**. Ante la duda: menos elementos,
textos más cortos y claros, una acción principal evidente por pantalla. Estética limpia y actual
(espaciado generoso, bordes redondeados, transiciones suaves y discretas), sin adornos que distraigan.
Debe sentirse como una app moderna, no como un sistema administrativo antiguo.

## Qué construir

1. En pantallas menores a `md` (768 px):
   - La barra lateral queda oculta por defecto y se muestra como panel superpuesto (encima del contenido,
     con fondo oscuro semitransparente detrás).
   - Una barra superior fija con el logo/nombre **Relum** y un botón con icono **y texto** «Menú»
     (`aria-expanded`, `aria-controls`).
   - El panel se cierra con: botón «Cerrar menú» (con texto), tecla Esc, clic en el fondo oscuro y al
     navegar a otra página.
   - Al abrir, el foco pasa al panel; al cerrar, vuelve al botón «Menú». Mientras está abierto no se
     desplaza el contenido de atrás.
2. En `md` y mayores: comportamiento actual sin cambios.
3. Revisa que el modal de perfil que vive en el mismo archivo (`max-w-4xl`) no se salga de la pantalla
   en 375 px (que tenga desplazamiento vertical interno si no cabe).
4. Textos nuevos en `web/messages/es.json`, `en.json` y `fr.json`, bajo una clave nueva
   `"mobileMenu"` (no edites otras claves; otros agentes editan esos archivos al mismo tiempo, así que
   haz cambios pequeños y puntuales).

## No tocar

- Ningún archivo fuera de `protected-sidebar-layout.tsx` y `web/messages/*.json` (solo la clave nueva).
- Lógica de permisos, sesión ni las rutas de la API.

## Criterios de aceptación

- `./node_modules/.bin/tsc --noEmit -p .` sin errores (desde `web/`).
- Sin nuevos errores de lint en el archivo tocado.
- Los tres JSON de mensajes siguen siendo válidos.
- No hagas commit. No corras `npm run build` (el sandbox no tiene red; lo corre el orquestador).

## Resultado

Implementado por Codex (`gpt-6.2-sol`); resumen del agente en `002-menu-movil.resultado.md`.

Verificación común del orquestador (2026-11-22), tareas 002–004 juntas:
- `tsc --noEmit` sin errores y `next build` completo exitoso.
- Lint: ningún archivo tocado empeora (varios bajan: roles 16→14, registro 1→0…); `components/ui` sin errores.
- Los tres JSON de mensajes son válidos; ninguna llamada al servidor cambió en el diff.
- Navegador (375 px): barra «Relum · Menú» visible; el menú abre como panel, bloquea el desplazamiento,
  se cierra con Esc y el foco vuelve a «Menú».
- Corrección del orquestador: al abrir, el foco no entraba al panel porque el contenido aún estaba en
  transición de invisible a visible. Ahora se enfoca «Cerrar menú» dos cuadros después
  (`requestAnimationFrame`). Confirmado que sin transiciones el botón sí recibe el foco; el foco
  automático no se pudo ver porque el panel del navegador de pruebas estaba oculto (pausa animaciones).

Pendiente detectado: en celular, las secciones con submenú propio (p. ej. `users/layout.tsx`) muestran
el submenú a pantalla completa y esconden el contenido debajo.
