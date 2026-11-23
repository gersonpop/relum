# Tarea 004 — Diálogos accesibles, confirmaciones y acciones de tablas con texto

Estado: terminada · Agente: Codex · Orquestador: Claude

## Objetivo

Las pantallas de administración heredadas de FluidSell usan ventanas emergentes hechas a mano
(`fixed inset-0 …`) que no se cierran con Esc ni manejan el foco, acciones de tablas que son solo iconos
(con `title`), y en algunos casos borran sin pedir confirmación o con `window.confirm`.

## Principio de diseño (esencia de Relum)

Relum debe ser **ultraintuitiva, simple, funcional pero moderna**. Ante la duda: menos elementos,
textos más cortos y claros, una acción principal evidente por pantalla. Estética limpia y actual
(espaciado generoso, bordes redondeados, transiciones suaves y discretas), sin adornos que distraigan.
Debe sentirse como una app moderna, no como un sistema administrativo antiguo.

## Qué construir

1. **Componentes compartidos** en `web/src/components/ui/`:
   - `dialog.tsx`: ventana emergente accesible con `role="dialog"`, `aria-modal`, `aria-labelledby`;
     se cierra con Esc y con clic en el fondo (configurable), atrapa el foco dentro mientras está
     abierta, devuelve el foco al elemento que la abrió, bloquea el desplazamiento de fondo, y en
     375 px de ancho no se sale de la pantalla (desplazamiento interno). Botón «Cerrar» con texto o
     `aria-label` claro.
   - `confirm-dialog.tsx`: confirmación para acciones destructivas: título, descripción de qué se va a
     borrar/desactivar y si se puede deshacer, botones «Cancelar» (foco inicial) y uno rojo con el
     verbo concreto («Eliminar rol», «Desactivar usuario»). Estado de carga mientras se ejecuta.
   - Sin dependencias nuevas.
2. **Aplicarlos** en estos archivos (todos en `web/src/app/[locale]/(protect)/`):
   `companies/component.companies.tsx`, `companies/manager/component.manager.tsx`,
   `setting/modules/component.modules.tsx`, `setting/multidata/component.multidata.tsx`,
   `users/manager/component.manager.tsx`, `users/onBoarding/component.onboarding.tsx`,
   `users/positions/component.positions.tsx`, `users/roles/component.roles.tsx`.
   - Reemplaza cada ventana emergente hecha a mano por `Dialog` (manteniendo su contenido y lógica).
   - Toda acción que borre, desactive o rechace pasa por `ConfirmDialog` (reemplaza `window.confirm`).
   - Botones de acción en filas de tablas: icono **más texto** visible («Editar», «Eliminar»,
     «Ver detalle»…). Si no cabe en pantallas pequeñas, el texto puede ocultarse visualmente solo
     debajo de `sm` pero debe seguir en `aria-label`.
3. Textos nuevos en `web/messages/es.json`, `en.json` y `fr.json` bajo una clave nueva `"dialogs"`
   (no edites otras claves; otros agentes editan esos archivos al mismo tiempo, así que haz cambios
   pequeños y puntuales). Los textos fijos existentes en los componentes pueden quedarse fijos, pero
   corrige tildes y jerga («status», «ID», «scope», «Deprecada (Warning)») cuando pases por ellos.

## No tocar

- `web/src/components/protected-sidebar-layout.tsx` y `web/src/app/[locale]/onboarding/` (otras tareas).
- Rutas de la API, lógica de permisos ni las llamadas al servidor (solo la capa visual).

## Criterios de aceptación

- `./node_modules/.bin/tsc --noEmit -p .` sin errores (desde `web/`).
- Sin nuevos errores de lint en los archivos tocados (hay errores heredados de `any`: no agregues más).
- Los tres JSON de mensajes siguen siendo válidos.
- Ningún `window.confirm` / `confirm(` queda en esos archivos.
- No hagas commit. No corras `npm run build` (el sandbox no tiene red; lo corre el orquestador).

## Resultado

Implementado por Codex (`gpt-6.2-sol`); resumen del agente en `004-dialogos-y-acciones.resultado.md`.
Nuevos `web/src/components/ui/dialog.tsx` (sobre `<dialog>` nativo) y `confirm-dialog.tsx`, aplicados
en las 8 pantallas de administración.

Verificación común del orquestador (2026-11-22), tareas 002–004 juntas:
- `tsc --noEmit` sin errores y `next build` completo exitoso.
- Lint: ningún archivo tocado empeora (varios bajan: roles 16→14, registro 1→0…); `components/ui` sin errores.
- Los tres JSON de mensajes son válidos; ninguna llamada al servidor cambió en el diff.
- Navegador (escritorio, Roles → «Ver permisos»): la ventana abre con título accesible, el foco entra,
  Esc la cierra y el foco vuelve al botón que la abrió.
- No se ejecutó ninguna confirmación destructiva (la base local apunta a datos compartidos).
