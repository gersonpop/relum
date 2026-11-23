# AGENTS.md — Relum

Instrucciones permanentes para cualquier agente (Codex, Claude u otro) que trabaje en este repositorio.
Léelo completo antes de tocar código.

## Qué es Relum

Relum es una app web de **gestión de mantenimiento**: órdenes de trabajo, equipos/activos, confiabilidad,
datos y reportes. Está pensada para usuarios **no técnicos** en Colombia (técnicos, supervisores, jefes de
mantenimiento). El enfoque es "la IA propone, el usuario decide".

La base de código es una copia de FluidSell (otro producto del mismo autor). Todavía quedan pantallas y
tablas heredadas (empresas, usuarios, roles, cargos, módulos). Lo propio de mantenimiento está por construir.

- Estrategia de producto (qué es gratis y qué se cobra): `docs/relum/ESTRATEGIA.md`
- Estado actual, infraestructura y pendientes: `docs/relum/ESTADO.md`
- Cómo se reparte el trabajo entre agentes: `docs/relum/ORQUESTACION.md`
- Registro de tareas delegadas: `docs/relum/tareas/`
- `docs/fluidsell-legado/` es documentación del producto anterior: **no es fuente de verdad** para Relum.

## Estructura

- `web/` — aplicación Next.js (frontend + API interna). Todo el trabajo de código ocurre aquí.
- `web/src/app/[locale]/` — páginas (i18n con next-intl: `es`, `en`, `fr`; el español es el idioma principal).
- `web/src/app/api/v1/` — API interna.
- `web/src/server/` — lógica de servidor (base de datos, autenticación de la API, almacenamiento).
- `web/messages/{es,en,fr}.json` — textos visibles.
- `web/prisma/` — esquema de referencia. La app consulta PostgreSQL con `pg` directamente.
- `mobile/`, `n8n/` — vacíos por ahora.

## Stack

Next.js 16 (App Router, ¡versión con cambios importantes! lee `web/AGENTS.md`), React 19, Tailwind 4,
NextAuth v4 (Google, Facebook, LinkedIn, Microsoft), PostgreSQL 17, Node 22 en producción.

## Comandos (desde `web/`)

```bash
npm ci                         # instalar
npm run dev                    # desarrollo
./node_modules/.bin/tsc --noEmit -p .   # chequeo de tipos (obligatorio antes de entregar)
npm run lint                   # lint (hay errores heredados de `any`; no agregues nuevos)
npm run build                  # build de producción (standalone)
```

## Reglas obligatorias

1. **Trabaja en la rama `main`.** No crees ramas salvo que se pida explícitamente.
2. **No hagas commit ni push** a menos que la tarea lo pida. El orquestador revisa y hace el commit.
3. **Nunca escribas secretos** (contraseñas, tokens, `DATABASE_URL`, claves OAuth) en código, docs o logs.
   Los secretos viven en `web/.env.local` (local, ignorado por git) y en las variables de Coolify (producción).
4. **Seguridad de la API:** toda ruta en `web/src/app/api/` debe identificar al usuario con
   `requireApiActor`, `requireSessionUser` o `requireSuperUser` de `web/src/server/api-auth.ts`.
   Nunca confíes en cabeceras enviadas por el navegador para rol, usuario o empresa.
5. **Textos para el usuario en español claro**, con tildes y signos ¿¡ correctos, sin jerga técnica
   (nada de "API", "BD", "scope", "status", "ID clave"). Agrega los textos en `messages/es.json` y, si
   aplica, en `en.json` y `fr.json`.
6. **UI hiperintuitiva:** etiquetas visibles en todos los campos, acciones con texto (no solo iconos),
   confirmación antes de acciones destructivas, estados vacío/cargando/error con el siguiente paso claro.
7. **Dependencias:** si cambias `package.json`, regenera `package-lock.json` con **npm 10**
   (`npx -y npm@10 install --package-lock-only`). La imagen Docker usa Node 22 / npm 10 y `npm ci`
   falla si el lockfile no está sincronizado.
8. **No toques** `docs/fluidsell-legado/`, la carpeta de FluidSell original ni la infraestructura
   (Coolify, DNS, Google/Microsoft) — eso lo hace el orquestador.
9. Cambios pequeños y enfocados en lo que pide la tarea. No reformatees archivos completos.

## Definición de terminado

- `tsc --noEmit` sin errores y `npm run build` exitoso.
- Sin nuevos errores de lint en los archivos tocados.
- Textos en español revisados.
- Un resumen final con: archivos cambiados, qué se hizo, cómo se verificó y qué quedó pendiente.
