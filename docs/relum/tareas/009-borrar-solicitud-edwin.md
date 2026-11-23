# Tarea 009 — Script para borrar las solicitudes de registro de «Edwin Saldaña»

Estado: terminada · Agente: Codex · Orquestador: Claude

## Objetivo

La tabla `"Onboarding"` (solicitudes de registro) de producción tiene datos heredados de FluidSell. El
usuario pidió borrar **solo** las solicitudes de «Edwin Saldaña». El orquestador las consultó (solo
lectura) y son exactamente 2 filas:

| email | name | last_name | provider | status | companyId | creada |
|---|---|---|---|---|---|---|
| gersonpop@hotmail.com | Edwin | Saldaña | facebook | active | COMP-1781215192217-9230 | 2026-06-16 |
| gersonpop@hotmail.com | Edwin | Saldaña | facebook | pending_approval | COMP-1781273850931-6711 | 2026-06-17 |

Ojo: con el mismo correo existe otra solicitud, «Gerson Porras» (linkedin, `failed`), que **no** se
borra.

## Qué construir

Un archivo `docs/relum/scripts/009-borrar-solicitud-edwin.sql` para ejecutar con
`psql -U relum -d relum -v ON_ERROR_STOP=1 -f <archivo>`:

1. Todo dentro de una sola transacción (o un bloque `DO`), de forma que si algo no cuadra no se borre
   nada.
2. Borra de `"Onboarding"` las filas con `lower(email) = 'gersonpop@hotmail.com'`, `name = 'Edwin'` y
   `last_name = 'Saldaña'`. Ninguna otra condición más amplia.
3. Verifica que se borraron **exactamente 2** filas; si no, lanza una excepción con un mensaje en
   español y deshace todo.
4. Al final, muestra las filas que quedan con ese correo (solo debe quedar «Gerson Porras») y el total de
   filas de `"Onboarding"` (debe ser 12).
5. Comentarios breves en español al inicio: qué hace, que ya hay copia previa y cómo se ejecuta.

## No tocar

- **No ejecutes el script** ni te conectes a ninguna base (lo ejecuta el orquestador en producción).
- No toques ningún archivo de `web/` (otra tarea de Codex está trabajando ahí).

## Criterios de aceptación

- El script es válido para PostgreSQL 17 y respeta los nombres con comillas (`"Onboarding"`).
- No hagas commit.

## Resultado

Script escrito por Codex (`docs/relum/scripts/009-borrar-solicitud-edwin.sql`), revisado por el orquestador.
Ejecución en producción (2026-11-23), desde la terminal de `relum-db` en Coolify:
- Copia previa: `/var/lib/postgresql/data/respaldo-antes-borrar-edwin-20261123.dump`.
- Archivo transferido verificado por suma SHA-256 (`9c5a86444d10f97a…`).
- Resultado: 2 filas borradas; con `gersonpop@hotmail.com` queda solo «Gerson Porras» (linkedin, failed);
  total de `"Onboarding"`: 12. `COMMIT` correcto. Archivo temporal eliminado del servidor.
