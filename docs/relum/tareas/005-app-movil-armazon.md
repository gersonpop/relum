# Tarea 005 — Armazón de aplicación móvil

Estado: terminada · Agente: Codex · Orquestador: Claude

## Objetivo

En el celular, Relum debe verse como una app: barra superior compacta, contenido a pantalla completa y
una **barra de pestañas inferior** para moverse, y poder **instalarse** en la pantalla de inicio.

## Principio de diseño (esencia de Relum)

Relum debe ser **ultraintuitiva, simple, funcional pero moderna**. En celulares (< 768 px) debe
**verse y sentirse como una aplicación móvil nativa**, no como una página web encogida: pantalla
completa, nada de tarjetas flotantes con márgenes alrededor de todo, fondo sólido limpio (sin fotos de
fondo detrás del contenido), tipografía y zonas táctiles cómodas (mínimo 44 px), transiciones suaves y
discretas, respeto a las zonas seguras del teléfono (`env(safe-area-inset-*)`). En escritorio (≥ 768 px)
el comportamiento actual no cambia.

## Qué construir

1. En `web/src/components/protected-sidebar-layout.tsx` (solo < 768 px; el menú lateral de escritorio no cambia):
   - **Barra superior** (ya existe, tarea 002): fija, compacta, con el título de la sección actual en
     lugar de solo «Relum»; fondo sólido; respeta `safe-area-inset-top`.
   - **Barra de pestañas inferior** fija: hasta 4 secciones principales del menú (las mismas que el
     usuario ya puede ver según sus permisos, en el mismo orden del menú) con icono **y texto corto**,
     la activa resaltada, más una pestaña «Más» que abre el panel de menú existente (perfil, resto de
     secciones, tema, cerrar sesión). Respeta `safe-area-inset-bottom`. Zonas táctiles ≥ 44 px.
   - El botón «Menú» de la barra superior puede quedarse o pasar a la pestaña «Más»; que no haya dos
     caminos confusos para lo mismo.
   - **Contenido a pantalla completa**: en móvil quita la tarjeta redondeada con márgenes y el fondo con
     foto/desenfoque alrededor del contenido; fondo sólido; espacio inferior para que la barra de pestañas
     no tape nada.
2. **App instalable (PWA básica):**
   - `web/src/app/manifest.ts` (convención de Next.js; revisa `node_modules/next/dist/docs/`):
     nombre «Relum», `display: "standalone"`, `start_url` hacia la app, colores de tema y fondo,
     iconos 192 y 512 px.
   - Genera los iconos PNG (192, 512 y `apple-touch-icon` 180) a partir de `web/public/logo_icon.png`
     con `sips` (macOS) y guárdalos en `web/public/icons/`.
   - En `web/src/app/layout.tsx`: `viewport` con `viewportFit: "cover"` y `themeColor`, y
     `appleWebApp` (capable, título «Relum», barra de estado). Sin service worker por ahora.
3. Textos nuevos bajo la clave `"mobileMenu"` existente en `web/messages/{es,en,fr}.json` (cambios
   pequeños y puntuales: otros agentes editan esos archivos a la vez con otras claves).

## No tocar

- `web/src/components/module-patterns/`, `web/src/app/[locale]/page.tsx`, `login-showcase.tsx`,
  `social-auth-buttons.tsx` (otras tareas), API, permisos y sesión.

## Criterios de aceptación

- `./node_modules/.bin/tsc --noEmit -p .` sin errores (desde `web/`); sin nuevos errores de lint.
- JSON válidos. Escritorio igual que hoy.
- No hagas commit. No corras `npm run build` (lo corre el orquestador).

## Resultado

Implementado por Codex; resumen en `005-app-movil-armazon.resultado.md`. Manifiesto en
`web/src/app/manifest.ts`, iconos en `web/public/icons/`.

Verificación del orquestador (2026-11-23), tareas 005–007 juntas:
- `tsc --noEmit` sin errores, `next build` exitoso (aparece `/manifest.webmanifest`), lint sin errores nuevos,
  JSON válidos.
- Navegador a 375×667: bienvenida a pantalla completa sin desplazamiento; Usuarios → Roles con barra
  superior (título de sección), pestañas horizontales fijas, barra inferior (Panel, Flujos, Usuarios,
  Empresas, Más) y «Más» con perfil, secciones restantes, tema y cerrar sesión. Escritorio sin cambios.
- Pendiente: probar «Agregar a la pantalla de inicio» en un teléfono real.
