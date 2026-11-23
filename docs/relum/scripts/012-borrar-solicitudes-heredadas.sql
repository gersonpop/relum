-- Borra las 12 solicitudes de registro heredadas de FluidSell.
-- Ya existe una copia previa de los datos.
-- Ejecutar con psql -U relum -d relum -v ON_ERROR_STOP=1 -f docs/relum/scripts/012-borrar-solicitudes-heredadas.sql

BEGIN ISOLATION LEVEL READ COMMITTED;

-- Si una política oculta filas, la comprobación debe fallar.
SET LOCAL row_security = off;

LOCK TABLE "Onboarding" IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
    ids_heredados CONSTANT text[] := ARRAY[
        'ONB-1780507109040-9855',
        'ob-t1-111111111',
        'ob-t1-112233445',
        'ob-t1-115566778',
        'ob-t2-222222222',
        'ob-t2-221144335',
        'ob-t2-225577668',
        'onb_admin_alfa_1',
        'onb_admin_beta_2',
        'onb_admin_gamma_3',
        'onb_multi_999',
        'onb_user_888'
    ];
    fecha_corte CONSTANT date := DATE '2026-11-22';
    llave record;
    hay_referencia boolean;
    filas_borradas bigint;
BEGIN
    -- Usa las columnas y el operador de cada llave, incluidas las llaves compuestas.
    FOR llave IN
        SELECT restriccion.conrelid::regclass AS tabla,
               restriccion.conname AS nombre,
               string_agg(
                   format('solicitud.%I OPERATOR(%I.%s) dependiente.%I',
                          destino.attname, esquema_operador.nspname, igualdad.oprname,
                          origen.attname),
                   ' AND ' ORDER BY columnas.posicion
               ) AS condicion
        FROM pg_catalog.pg_constraint AS restriccion
        CROSS JOIN LATERAL unnest(restriccion.conkey, restriccion.confkey, restriccion.conpfeqop)
            WITH ORDINALITY AS columnas(origen, destino, operador, posicion)
        JOIN pg_catalog.pg_attribute AS origen
            ON origen.attrelid = restriccion.conrelid AND origen.attnum = columnas.origen
        JOIN pg_catalog.pg_attribute AS destino
            ON destino.attrelid = restriccion.confrelid AND destino.attnum = columnas.destino
        JOIN pg_catalog.pg_operator AS igualdad ON igualdad.oid = columnas.operador
        JOIN pg_catalog.pg_namespace AS esquema_operador ON esquema_operador.oid = igualdad.oprnamespace
        WHERE restriccion.contype = 'f'
          AND restriccion.confrelid = '"Onboarding"'::regclass
        GROUP BY restriccion.oid, restriccion.conrelid, restriccion.conname
        ORDER BY restriccion.conrelid, restriccion.oid
    LOOP
        -- Impide que aparezcan nuevas referencias entre la comprobación y el borrado.
        EXECUTE format('LOCK TABLE %s IN SHARE MODE', llave.tabla);
        EXECUTE format(
            'SELECT EXISTS (
                SELECT 1
                FROM %s AS dependiente
                JOIN "Onboarding" AS solicitud ON %s
                WHERE solicitud."id" = ANY ($1) AND solicitud."created_at" < $2
            )',
            llave.tabla, llave.condicion
        ) INTO hay_referencia USING ids_heredados, fecha_corte;

        IF hay_referencia THEN
            RAISE EXCEPTION 'Se canceló el borrado: la tabla % referencia solicitudes heredadas mediante la llave foránea %.',
                llave.tabla, llave.nombre;
        END IF;
    END LOOP;

    DELETE FROM "Onboarding"
    WHERE "id" = ANY (ids_heredados)
      AND "created_at" < fecha_corte;

    GET DIAGNOSTICS filas_borradas = ROW_COUNT;
    IF filas_borradas <> 12 THEN
        RAISE EXCEPTION 'Se esperaban borrar exactamente 12 solicitudes heredadas, pero se borraron %. Se canceló el borrado.',
            filas_borradas;
    END IF;

    IF EXISTS (SELECT 1 FROM "Onboarding" WHERE "id" = ANY (ids_heredados)) THEN
        RAISE EXCEPTION 'Todavía quedan solicitudes con los identificadores heredados. Se canceló el borrado.';
    END IF;
END;
$$;

SELECT count(*) AS total_solicitudes,
       count(*) FILTER (WHERE "created_at" >= DATE '2026-11-22') AS solicitudes_desde_el_corte
FROM "Onboarding";

COMMIT;
