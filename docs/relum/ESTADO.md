# Estado de Relum

Última actualización: 2026-11-22.

## En producción

| Pieza | Detalle |
|---|---|
| URL | **https://datafy.site** (también `www.datafy.site`), HTTPS con Let's Encrypt. La dirección temporal `relum.187.53.107.149.sslip.io` sigue respondiendo, pero el inicio de sesión ya va a `datafy.site` |
| Dominio | `datafy.site`, comprado en Hostinger; registro A `@` → 187.53.107.149 y `www` CNAME → `datafy.site` |
| Código | GitHub `gersonpop/relum` (público), rama `main` |
| Servidor | VPS Hostinger KVM 4, Ubuntu 24.04, IP 187.53.107.149 |
| Orquestador de despliegue | Coolify (`http://187.53.107.149:8000`), proyecto **Relum** → entorno `production` |
| App | recurso **relum-web**: build con `web/Dockerfile` (base `/web`), puerto 3000 |
| Base de datos | recurso **relum-db**: PostgreSQL 17, base/usuario `relum`, acceso **privado** (solo red interna) |
| Fotos subidas | volumen `relum-uploads` montado en `/app/data`; se sirven por `/api/v1/files/<nombre>` |
| Salud | `GET /api/health` (200 si la base responde); Coolify lo usa como healthcheck |
| Despliegue | manual: botón **Deploy/Redeploy** en Coolify (toma el último commit de `main`) |

### Variables de entorno (en Coolify, nunca en git)

`NEXTAUTH_URL`, `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`,
`AUTH_FACEBOOK_ID/SECRET`, `AUTH_LINKEDIN_ID/SECRET`, `AUTH_MICROSOFT_ID/SECRET`.
`UPLOADS_DIR` lo define el Dockerfile. `DEV_FAKE_SESSION=true` solo en desarrollo local.

### Inicio de sesión

- **Google:** cliente OAuth "fluidsell" del proyecto GCP `agrotrack-436721` (compartido con FluidSell); tiene origen y retorno de `datafy.site`.
- **Microsoft:** app "Relum" en Microsoft Entra (secreto «datafy» vigente desde 2026-11-23; el secreto viejo «Relum» se puede borrar) (cuenta personal del autor), multiinquilino + cuentas
  personales, notificaciones opcionales `email` y `xms_edov`. El secreto vence en 24 meses.
  Cuentas de empresa de otras organizaciones necesitan verificación de editor o aprobación de su administrador.
- **Facebook / LinkedIn:** heredados de FluidSell.
- Reglas de seguridad: el correo de Microsoft solo se acepta si está verificado; los permisos solo se
  cargan si el usuario entra con la misma red con la que se registró.

### Base de datos

Copia del esquema y datos de FluidSell (2026-11-22): 31 tablas, catálogos de países/departamentos/ciudades,
módulos del menú, roles, usuarios y empresas de prueba. La empresa `900000000` se llama **Relum**.
Los permisos (`UserRole.hash_permission`) están cifrados con `AUTH_SECRET`: si se cambia ese valor hay que
volver a cifrarlos.

## Historial de cambios relevantes

| Commit | Cambio |
|---|---|
| 6e167a2 | Copia base de FluidSell |
| 8ce8684 | Marca Relum, textos del login para mantenimiento, tildes y jerga corregidas |
| afe1d5d | Seguridad: la API identifica al usuario por la sesión, no por cabeceras |
| 1bbb9f0 | Dockerfile, build standalone, fotos en volumen persistente |
| 278db3f | `package-lock.json` sincronizado para npm 10 |
| 40ee594 | Inicio de sesión con Microsoft |
| 6ae7112 | Orquestación con Codex, documentación de Relum, healthcheck `/api/health` |
| d50b34d | Usabilidad: menú móvil, registro en pasos, diálogos accesibles y confirmaciones (tareas 002–004) |
| a8e9d88 | Relum como app móvil: barra inferior, pestañas por sección, bienvenida a pantalla completa, instalable (tareas 005–007) |
| 42f8d5b | Solo entran usuarios registrados y aprobados; API 403 a cuentas no activas (tarea 008) |

## Pendientes (backlog)

Prioridad alta
- [ ] Copias de seguridad programadas de `relum-db` en Coolify.
- [x] Healthcheck de la app: `GET /api/health` + `HEALTHCHECK` en el Dockerfile (tarea 001).
- [ ] Módulos propios de mantenimiento: equipos/activos, órdenes de trabajo, planes preventivos, reportes.

Prioridad media
- [x] Dominio propio: `datafy.site` (DNS en Hostinger, Coolify, `NEXTAUTH_URL`, Google y Microsoft) — 2026-11-22.
- [ ] Facebook y LinkedIn: agregar `https://datafy.site/api/auth/callback/{facebook,linkedin}` en sus apps (heredadas de FluidSell) o quitar esos botones.
- [x] Mejoras de usabilidad de la auditoría inicial: registro en pasos con etiquetas, acciones de tablas
      con texto, menú móvil, diálogos accesibles (Esc, foco), confirmaciones (tareas 002–004).
- [x] En celular, Relum se ve como app: barra inferior, pestañas en las secciones, bienvenida a pantalla
      completa e instalable en la pantalla de inicio (tareas 005–007).
- [ ] En celular, las tablas de administración se desplazan de lado; pasarlas a tarjetas.
- [x] Logo propio de Relum (variante «Esencial»: renglones + llave con punta de lápiz). Fuentes en
      `web/public/brand/`; iconos en `web/public/icons/`, `web/public/logo_icon.png` y `web/src/app/favicon.ico`.
- [ ] Probar el registro en pasos con una cuenta nueva en producción.
- [ ] Reemplazar imágenes de fondo heredadas de FluidSell en login y registro.
- [ ] Cliente OAuth de Google propio para Relum (hoy usa el de FluidSell).
- [ ] Rotar `AUTH_SECRET` (re-cifrando permisos) para separar del todo a Relum de FluidSell.

Prioridad baja
- [ ] Decidir si el repositorio de GitHub debe ser privado (requiere GitHub App en Coolify).
- [ ] Despliegue automático en cada push a `main`.
- [x] Usuarios de prueba borrados (2026-11-23): quedó solo `gersonpop1@gmail.com` (SU). Copia previa en el
      contenedor de `relum-db`: `/var/lib/postgresql/data/respaldo-antes-borrar-usuarios-20261123.dump`
      (formato `pg_dump -Fc`; restaurar con `pg_restore`).
- [x] Solicitudes de «Edwin Saldaña» borradas (tarea 009). Copia previa:
      `/var/lib/postgresql/data/respaldo-antes-borrar-edwin-20261123.dump`.
- [x] Una solicitud «fallida» ya no bloquea registrarse con otra red (tarea 010).
- [ ] Limpiar el resto de datos heredados: empresas Alfa/Beta/Gamma y 12 solicitudes de registro (`Onboarding`).
