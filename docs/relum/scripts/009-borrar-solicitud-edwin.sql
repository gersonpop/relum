-- Borra las dos solicitudes de registro de Edwin Saldaña.
-- Ya existe una copia previa de los datos.
-- Ejecutar con psql -U relum -d relum -v ON_ERROR_STOP=1 -f docs/relum/scripts/009-borrar-solicitud-edwin.sql

BEGIN;

LOCK TABLE "Onboarding" IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
    filas_borradas bigint;
    filas_del_correo bigint;
    filas_de_gerson bigint;
    total_solicitudes bigint;
BEGIN
    DELETE FROM "Onboarding"
    WHERE lower(email) = 'gersonpop@hotmail.com'
      AND name = 'Edwin'
      AND last_name = 'Saldaña';

    GET DIAGNOSTICS filas_borradas = ROW_COUNT;
    IF filas_borradas <> 2 THEN
        RAISE EXCEPTION 'Se esperaba borrar 2 solicitudes de Edwin Saldaña, pero se afectaron %.', filas_borradas;
    END IF;

    SELECT count(*),
           count(*) FILTER (WHERE lower(email) = 'gersonpop@hotmail.com'),
           count(*) FILTER (WHERE lower(email) = 'gersonpop@hotmail.com'
                              AND name = 'Gerson' AND last_name = 'Porras')
    INTO total_solicitudes, filas_del_correo, filas_de_gerson
    FROM "Onboarding";

    IF filas_del_correo <> 1 OR filas_de_gerson <> 1 THEN
        RAISE EXCEPTION 'Para este correo debe quedar únicamente la solicitud de Gerson Porras.';
    END IF;

    IF total_solicitudes <> 12 THEN
        RAISE EXCEPTION 'Se esperaban 12 solicitudes en total, pero quedaron %.', total_solicitudes;
    END IF;
END;
$$;

SELECT email, name, last_name, provider, status, "companyId", created_at
FROM "Onboarding"
WHERE lower(email) = 'gersonpop@hotmail.com';

SELECT count(*) AS total_solicitudes FROM "Onboarding";

COMMIT;
