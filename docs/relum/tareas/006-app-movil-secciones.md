# Tarea 006 — Secciones con submenú como pestañas en el celular

Estado: terminada · Agente: Codex · Orquestador: Claude

## Objetivo

Hoy, en el celular, las secciones con submenú (Usuarios, Empresa, Configuración) muestran el submenú a
pantalla completa y el contenido queda escondido debajo. Debe comportarse como una app.

## Principio de diseño (esencia de Relum)

Relum debe ser **ultraintuitiva, simple, funcional pero moderna**. En celulares (< 768 px) debe
**verse y sentirse como una aplicación móvil nativa**, no como una página web encogida: pantalla
completa, nada de tarjetas flotantes con márgenes alrededor de todo, fondo sólido limpio (sin fotos de
fondo detrás del contenido), tipografía y zonas táctiles cómodas (mínimo 44 px), transiciones suaves y
discretas, respeto a las zonas seguras del teléfono (`env(safe-area-inset-*)`). En escritorio (≥ 768 px)
el comportamiento actual no cambia.

## Qué construir

1. En `web/src/components/module-patterns/EmbeddedPattern.tsx`, solo < 768 px:
   - El submenú pasa a ser una **fila de pestañas horizontal** (desplazable si no caben, sin barra de
     desplazamiento visible) arriba del contenido, con la pestaña activa resaltada y visible
     (desplázala a la vista al cargar). Texto siempre visible; icono opcional.
   - El contenido ocupa todo el ancho y alto restante, con su propio desplazamiento.
   - Quita en móvil el panel redimensionable, bordes y márgenes que hacen ver «página web».
2. Revisa `web/src/components/module-patterns/NewPagePattern.tsx` para que en móvil el título y la
   descripción de página sean compactos (título claro, descripción corta o ninguna) y no consuman media
   pantalla.
3. Escritorio sin cambios.
4. Si necesitas textos nuevos, bajo una clave nueva `"sectionTabs"` en `web/messages/{es,en,fr}.json`
   (cambios puntuales: otros agentes editan esos archivos a la vez).

## No tocar

- `protected-sidebar-layout.tsx`, `app/layout.tsx`, la página de inicio de sesión (otras tareas),
  los `layout.tsx` de las secciones salvo que sea imprescindible, API y permisos.

## Criterios de aceptación

- `tsc --noEmit` sin errores; sin nuevos errores de lint; JSON válidos.
- No hagas commit. No corras `npm run build`.

## Resultado

Implementado por Codex; resumen en `006-app-movil-secciones.resultado.md`.

Verificación del orquestador (2026-11-23), tareas 005–007 juntas:
- `tsc --noEmit` sin errores, `next build` exitoso (aparece `/manifest.webmanifest`), lint sin errores nuevos,
  JSON válidos.
- Navegador a 375×667: bienvenida a pantalla completa sin desplazamiento; Usuarios → Roles con barra
  superior (título de sección), pestañas horizontales fijas, barra inferior (Panel, Flujos, Usuarios,
  Empresas, Más) y «Más» con perfil, secciones restantes, tema y cerrar sesión. Escritorio sin cambios.
- Correcciones del orquestador:
  - En móvil la lista de Roles medía 2 px: los paneles heredados tenían altura fija anidada. Ahora en
    móvil los contenedores de `EmbeddedPattern` y `NewPagePattern` crecen con su contenido, la pantalla
    completa se desplaza y las pestañas quedan fijas arriba (`sticky`).
  - Entre 768 y 1024 px el submenú tapaba el contenido (ya pasaba antes): el diseño en columnas ahora
    empieza en 768 px, igual que el resto de la app.
