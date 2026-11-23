# Tarea 007 — Inicio de sesión como app móvil

Estado: terminada · Agente: Codex · Orquestador: Claude

## Objetivo

En el celular, la pantalla de inicio de sesión hoy es una tarjeta de vidrio sobre una foto y debajo un
carrusel de textos. Debe verse como la pantalla de bienvenida de una app.

## Principio de diseño (esencia de Relum)

Relum debe ser **ultraintuitiva, simple, funcional pero moderna**. En celulares (< 768 px) debe
**verse y sentirse como una aplicación móvil nativa**, no como una página web encogida: pantalla
completa, nada de tarjetas flotantes con márgenes alrededor de todo, fondo sólido limpio (sin fotos de
fondo detrás del contenido), tipografía y zonas táctiles cómodas (mínimo 44 px), transiciones suaves y
discretas, respeto a las zonas seguras del teléfono (`env(safe-area-inset-*)`). En escritorio (≥ 768 px)
el comportamiento actual no cambia.

## Qué construir

1. Archivos: `web/src/app/[locale]/page.tsx`, `web/src/components/login-showcase.tsx`,
   `web/src/components/social-auth-buttons.tsx`. Solo < 768 px (escritorio sin cambios):
   - Pantalla completa con fondo sólido o degradado suave de la marca (sin foto), logo de Relum
     (`/logo_icon.png`) y nombre arriba, una frase corta de valor, y los botones de acceso abajo, al
     alcance del pulgar, a todo el ancho, altos (≥ 48 px).
   - El selector de idioma, discreto (arriba a la derecha).
   - El carrusel de textos: oculto en móvil o reducido a un solo mensaje corto; nada de desplazamiento
     para llegar a los botones en un teléfono de 375×667.
   - Respeta zonas seguras (`env(safe-area-inset-*)`).
2. Textos nuevos, si hacen falta, en la clave `"HomePage"` existente de
   `web/messages/{es,en,fr}.json` (cambios puntuales: otros agentes editan esos archivos a la vez).

## No tocar

- La lógica de acceso (proveedores, `signIn`, NextAuth), `protected-sidebar-layout.tsx`,
  `module-patterns/`, `app/layout.tsx`.

## Criterios de aceptación

- `tsc --noEmit` sin errores; sin nuevos errores de lint; JSON válidos.
- No hagas commit. No corras `npm run build`.

## Resultado

Implementado por Codex; resumen en `007-app-movil-inicio-sesion.resultado.md`.

Verificación del orquestador (2026-11-23), tareas 005–007 juntas:
- `tsc --noEmit` sin errores, `next build` exitoso (aparece `/manifest.webmanifest`), lint sin errores nuevos,
  JSON válidos.
- Navegador a 375×667: bienvenida a pantalla completa sin desplazamiento; Usuarios → Roles con barra
  superior (título de sección), pestañas horizontales fijas, barra inferior (Panel, Flujos, Usuarios,
  Empresas, Más) y «Más» con perfil, secciones restantes, tema y cerrar sesión. Escritorio sin cambios.
- Nota: el logo (`/logo_icon.png`) es el heredado de FluidSell; falta un logo propio de Relum.
