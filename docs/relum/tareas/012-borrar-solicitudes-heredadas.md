# Tarea 012 — Script para borrar las 12 solicitudes de registro heredadas de FluidSell

Estado: terminada · Agente: Codex · Orquestador: Claude

## Objetivo

El usuario pidió borrar las solicitudes viejas de `"Onboarding"` que llegaron con la copia de la base de
FluidSell (2026-11-22). El orquestador las consultó en producción (solo lectura, 2026-11-23): son
exactamente estas 12 filas, todas creadas en junio de 2026 (antes de existir Relum):

| id | email | estado |
|---|---|---|
| ONB-1780507109040-9855 | gersonpop@hotmail.com (Gerson Porras, linkedin) | failed |
| ob-t1-111111111 | test1_u1@fluidsell.com | active |
| ob-t1-112233445 | test1_u2@fluidsell.com | active |
| ob-t1-115566778 | test1_u3@fluidsell.com | active |
| ob-t2-222222222 | test2_u1@fluidsell.com | active |
| ob-t2-221144335 | test2_u2@fluidsell.com | active |
| ob-t2-225577668 | test2_u3@fluidsell.com | active |
| onb_admin_alfa_1 | andres.alfa@fluidsell.com | active |
| onb_admin_beta_2 | beatriz.beta@fluidsell.com | active |
| onb_admin_gamma_3 | gerardo.gamma@fluidsell.com | active |
| onb_multi_999 | carlos.multi@fluidsell.com | active |
| onb_user_888 | ernesto.user@fluidsell.com | active |

## Qué construir

Un archivo `docs/relum/scripts/012-borrar-solicitudes-heredadas.sql`, para ejecutar con
`psql -U relum -d relum -v ON_ERROR_STOP=1 -f <archivo>`:

1. Una sola transacción; si algo no cuadra, no se borra nada.
2. Borra de `"Onboarding"` **solo** las filas cuyo `id` esté en la lista anterior **y** cuyo
   `created_at` sea anterior a `2026-11-22` (doble seguro para no tocar solicitudes reales de Relum).
3. Verifica que se borraron **exactamente 12**; si no, excepción en español y se deshace todo.
4. Verifica que no quede ninguna fila con esos `id`, y muestra al final cuántas filas quedan en
   `"Onboarding"` y cuántas creadas desde `2026-11-22` (las solicitudes reales, que no se tocan).
5. Antes de borrar, comprueba si alguna otra tabla tiene una llave foránea hacia `"Onboarding"`; si la
   hay y alguna fila la referencia, detente con un mensaje claro (no borres en cascada).
6. Comentarios breves en español al inicio: qué hace, que hay copia previa y cómo ejecutarlo.

## No tocar

- **No ejecutes el script** ni te conectes a ninguna base (lo ejecuta el orquestador).
- No toques `web/`.

## Criterios de aceptación

- Válido para PostgreSQL 17, con los nombres entre comillas (`"Onboarding"`). No hagas commit.

## Resultado

Script escrito por Codex (`docs/relum/scripts/012-borrar-solicitudes-heredadas.sql`), revisado por el
orquestador. Ejecución en producción (2026-11-23), terminal de `relum-db` en Coolify:
- Consulta previa (solo lectura): las mismas 12 filas, ninguna solicitud nueva.
- Copia previa: `/var/lib/postgresql/data/respaldo-antes-borrar-solicitudes-heredadas-20261123.dump`.
- Archivo verificado por SHA-256 (`dd7a3504765af2db…`); archivo temporal eliminado tras ejecutar.
- Resultado: 12 filas borradas, `COMMIT` correcto; `"Onboarding"` queda con 0 solicitudes.
