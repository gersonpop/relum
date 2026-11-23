# Tarea 013 — Cada empresa entra por su subdominio (`empresa.datafy.site`)

Estado: cancelada · Agente: Codex · Orquestador: Claude

## Decisión del producto (usuario, 2026-11-23)

El subdominio es **la entrada y el límite** de la empresa:
- Cada empresa tiene su dirección: `acme.datafy.site`.
- Un usuario solo puede usar Relum desde el subdominio de su empresa.
- Si alguien se registra desde un subdominio, su solicitud ya lleva esa empresa elegida.

## Restricciones técnicas conocidas

- **Google y Microsoft no aceptan direcciones de retorno con comodín.** El inicio de sesión (OAuth) se
  hace siempre en el dominio raíz: `NEXTAUTH_URL=https://datafy.site` no cambia.
- La sesión debe servir en todos los subdominios: la cookie de sesión de NextAuth se emite con
  `domain=.datafy.site` cuando la función está activa. Las cookies con prefijo `__Host-` (CSRF) no
  admiten dominio: déjalas como están.
- El DNS comodín y el certificado HTTPS los prepara el orquestador. No toques infraestructura.
- La app consulta PostgreSQL con `pg`. Los cambios de esquema **no** se aplican desde la app: van en un
  script SQL que ejecuta el orquestador.

## Qué construir

1. **Activación por configuración.** Agrega la variable de entorno nueva `RELUM_ROOT_DOMAIN`
   (ejemplo: `datafy.site`).
   - Si no está definida, todo funciona exactamente como hoy (desarrollo, `sslip.io`).
   - Si está definida, se activan los subdominios.
   - Para probar en local, admite que el dominio raíz sea `localhost:3000` (subdominios
     `acme.localhost:3000`). Si alguna parte no funciona en local, explícalo en el resultado.
   - Documenta la variable en `.env.example` si existe; no escribas valores secretos.
2. **Esquema.** Crea el script `docs/relum/scripts/013-subdominio-empresa.sql`:
   - Agrega a `"Company"` la columna `"subdomain"` (texto, opcional) si no existe.
   - Índice único sobre `lower("subdomain")`.
   - Restricción: solo `a-z`, `0-9` y `-`, de 3 a 40 caracteres, sin guion al inicio ni al final.
   - Una sola transacción, idempotente, con comentarios en español.
   - Actualiza también `web/prisma/schema.prisma` (solo como referencia).
   - Nombres reservados que no se pueden usar (valídalos en el código): `www`, `app`, `api`, `admin`,
     `mail`, `relum`, `datafy`, `login`, `auth`, `static`, `assets`, `soporte`, `help`.
3. **Reconocer la empresa por la dirección.** Crea un módulo de servidor (por ejemplo
   `web/src/server/tenant.ts`) que, a partir del `Host` de la petición, diga qué es:
   - el dominio raíz (`datafy.site` o `www.datafy.site`);
   - el subdominio de una empresa existente (devuelve `companyId`, nombre y subdominio);
   - un subdominio que no existe;
   - otro dominio (función apagada).

   El `Host` solo decide qué pantalla mostrar. El permiso siempre se comprueba contra la empresa del
   usuario en la base, así que un `Host` falso no da acceso a nada. Si Next 16 necesita `proxy.ts`
   (antes `middleware`), lee `web/AGENTS.md` y la documentación en `node_modules/next/dist/docs/`.
4. **Inicio de sesión.**
   - En un subdominio, la pantalla de ingreso muestra el nombre de la empresa (y su logo, si ya
     existe en `BrandProfile`).
   - Los botones de Google y Microsoft hacen el OAuth en el dominio raíz y, al terminar, devuelven al
     usuario al mismo subdominio.
   - Ajusta el callback `redirect` de NextAuth para aceptar solo destinos en el dominio raíz o en sus
     subdominios. Nada de redirecciones abiertas.
   - Cerrar sesión desde un subdominio borra la sesión compartida y vuelve al ingreso de ese subdominio.
5. **El límite (punto central de la tarea 008: `requireActivePageSession`, `(protect)/layout.tsx`, y
   `requireApiActor`/`requireSessionUser` en `web/src/server/api-auth.ts`).** Con la función activa:
   - **Subdominio de empresa + usuario activo de esa empresa** → entra.
     - Revisa cómo se relaciona el usuario con su empresa (`PlatformUser.companyId`, `UserRole`). Si un
       usuario pertenece a varias empresas, puede entrar por cualquiera de ellas.
     - En ese subdominio, la empresa de trabajo es la del subdominio.
   - **Subdominio de otra empresa** → pantalla clara: «Esta dirección es de otra empresa». Si su empresa
     tiene subdominio, botón «Ir a la dirección de tu empresa»; además, «Cerrar sesión». La API responde
     **403** en español.
   - **Dominio raíz + usuario activo:**
     - Si tiene una sola empresa con subdominio → redirige a ese subdominio (misma ruta).
     - Si tiene varias → pantalla para elegir empresa.
     - Si su empresa aún no tiene subdominio → sigue funcionando en el dominio raíz, como hoy.
   - **Súper usuario (SU):** puede entrar a cualquier subdominio y al dominio raíz sin ser redirigido.
   - **Subdominio que no existe** → pantalla «No encontramos esta empresa en Relum» con enlace a
     `https://datafy.site`.
   - No rompas los flujos de la tarea 008: `PENDING_ONLY`, `INACTIVE`, `FORM_REQUIRED`,
     `PROVIDER_CONFLICT` y las rutas del registro.
6. **Registro (`/onboarding`) desde un subdominio.** La empresa viene elegida y bloqueada, con el texto
   «Te estás registrando en {empresa}». El servidor toma la empresa del subdominio y no la que envíe
   el navegador. Desde el dominio raíz, el registro funciona como hoy.
7. **Administración de empresas.** En el formulario de empresas (solo SU), agrega el campo
   «Dirección de la empresa»:
   - Vista previa en vivo `acme.datafy.site`.
   - Validación en español: formato, nombres reservados y dirección ya usada.
   - La API de empresas guarda el campo validando en el servidor.
   - Ayuda corta: «Así entrarán tus usuarios. Usa solo letras minúsculas, números y guiones.»
8. **Textos** en `web/messages/{es,en,fr}.json`, bajo una clave nueva `"tenant"` (y donde corresponda).
   Español claro, sin jerga.

## No tocar

- **No ejecutes nada contra la base de producción** ni el script SQL.
- No toques infraestructura, `NEXTAUTH_URL` ni las apps OAuth.
- No cambies el cifrado de permisos (`hash_permission`).
- La lógica de solicitudes de las tareas 010 y 011, salvo lo imprescindible para el punto 6.

## Criterios de aceptación

- `./node_modules/.bin/tsc --noEmit -p .` sin errores (desde `web/`); sin nuevos errores de lint.
- Sin `RELUM_ROOT_DOMAIN`, el comportamiento es idéntico al actual.
- En el resultado, explica cómo comprobaste los casos del punto 5 (prueba o simulación) y cómo
  funcionan las cookies y la redirección de vuelta al subdominio.
- No hagas commit. No corras `npm run build`.

## Resultado

Cancelada (2026-11-23) a mitad de la ejecución: el usuario decidió no usar un subdominio por empresa.
Relum tendrá una sola dirección, `relum.datafy.site`, y la empresa la elige el usuario (las tablas ya
filtran los datos por empresa). Los cambios parciales de Codex se descartaron sin hacer commit.
