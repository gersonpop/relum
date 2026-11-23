# Estrategia de producto de Relum

Definida por el dueño del producto el 2026-11-22.

## Modelo

1. **Gratis — adquisición de datos.** Relum se regala a los equipos de mantenimiento para reemplazar la
   herramienta que hoy usan en Google Sheets. Todo lo que hoy hacen ahí debe funcionar igual (o más
   fácil) en Relum. Así entran los datos: equipos, órdenes de trabajo, fallas, tiempos, repuestos.
2. **De pago — valor sobre los datos.** Sobre esos datos se cobran:
   - **Confiabilidad:** MTBF, MTTR, disponibilidad, análisis de fallas, criticidad.
   - **Analítica de datos:** tableros, tendencias, costos, comparativos.
   - **Gestión de mantenimiento avanzada:** planes preventivos/predictivos, la IA que propone tareas y
     prioridades, y otras funciones de gestión.

## Primera fase (en curso)

Replicar en Relum las funcionalidades de la aplicación actual hecha en Google Sheets, para que los
usuarios puedan migrar sin perder nada:

1. Obtener la hoja (y su Apps Script, si tiene) y levantar el inventario de funcionalidades:
   pestañas, campos, fórmulas, validaciones, listas desplegables, formularios, reportes, permisos y
   automatizaciones.
2. Documentarlo en `docs/relum/hoja-actual/` (inventario + modelo de datos propuesto).
3. Dividirlo en tareas para Codex y construirlo en Relum.
4. Importar los datos existentes de la hoja a Relum.

## Principios

- La parte gratuita debe ser más fácil que la hoja: menos pasos, celular primero para los técnicos.
- Los datos se capturan desde el inicio con la estructura que necesitará la analítica de pago
  (fechas de inicio/fin, tipo de falla, equipo, tiempos), aunque la analítica llegue después.
