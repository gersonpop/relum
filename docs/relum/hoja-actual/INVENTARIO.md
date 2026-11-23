# Inventario de la aplicación actual en Google Sheets

Levantado por el orquestador el 2026-11-23, solo lectura, desde la cuenta del dueño del producto.
**Este repositorio es público:** aquí no van correos, nombres de personas, números de órdenes reales ni
identificadores de los archivos de Google. Solo la estructura y el comportamiento.

## 1. Piezas

| Pieza | Qué es |
|---|---|
| **Formato «Orden de trabajo digital v3.0»** (hoja de cálculo) | Un formato imprimible de OT (encabezado de la empresa, 9 secciones). Lo llena el técnico. Pestañas: `Orden de trabajo`, `Hoja 8` (tabla auxiliar de días→horas), `Referencias` (lista de puestos de trabajo). Hay una copia del formato por zona/campo. |
| **Apps Script «Código orden digital»** (ligado al formato) | Busca la orden en la base, llena el formato, oculta filas vacías, guarda la ejecución, genera PDF y lo envía por correo con adjuntos. Sin activadores automáticos: se ejecuta con botón/menú. |
| **«Base de datos Orden de trabajo digital»** (otra hoja de cálculo) | Tablas pegadas desde exportaciones de **SAP PM** + las ejecuciones guardadas. 12 pestañas (ver §3). |

## 2. Flujo actual (paso a paso)

1. **Planeación** exporta de SAP y pega en la base: órdenes (IW38), operaciones (IW48), materiales
   reservados, equipos (IH08), plan preventivo (IP24) y avisos.
2. **El técnico** abre el formato, escribe el **número de orden** (celda K2) y pulsa el botón de búsqueda
   (`buscarYColocarValores`):
   - Busca la orden en `Ordenes_IW38` y llena ~25 celdas: datos de la orden, del equipo y del aviso.
   - Trae las **operaciones** de la orden desde `Operaciones_IW48` (hasta 62; clave = orden + nº operación).
   - Trae los **materiales reservados** desde `Materiales` (hasta 16; clave = orden + posición).
   - Oculta las filas que quedaron vacías. Si no encuentra la orden, limpia todo.
3. El técnico **llena la ejecución** en el mismo formato (secciones 4–9).
4. Menú **Adjuntos → Abrir formulario**: diálogo para adjuntar archivos (fotos, documentos; obliga a
   adjuntar al menos uno) y botón **«Guardar y enviar orden de trabajo»** (`ejecutarProcesoCompleto`):
   1. Guarda la ejecución como una fila nueva (arriba) en `Datos 2` (`guardarValores`).
   2. Escribe en la OT la lista de nombres de los adjuntos.
   3. Exporta el formato a **PDF** (A4 vertical, rango B1:M127).
   4. **Envía un correo** con el PDF + adjuntos a 3 destinatarios fijos (supervisor y planeadores) más un
      correo adicional opcional escrito en la OT.
   5. Limpia el formato para la siguiente orden y muestra «Orden enviada».
5. Planeación usa `Datos 2` para notificar/cerrar en SAP (fuera de la hoja).

## 3. Datos

### 3.1 Formato de OT — secciones y campos

**Encabezado:** No. de orden · Tipo de orden (Preventivo/Correctivo/…) · Semana · Nº de permiso ·
Tipo de actividad (PROGRAMADA/…).

1. **Datos de la orden:** descripción · contador grupo hoja de ruta · frecuencia (1S, 6M, 1A…) ·
   fecha inicio extremo · fecha fin extremo · prioridad.
2. **Datos del equipo:** nº equipo · descripción · nº identificación técnica (TAG) · indicador ABC
   (A muy crítico, B crítico, C no crítico, S salvaguarda) · fabricante · tipo de equipo (Rotativos,
   Eléctricos, Seguridad y Control…) · ubicación técnica + denominación · centro emplazamiento ·
   emplazamiento · sistema · área.
3. **Datos del aviso:** descripción · tipo de aviso (Proactivo aut. plan, Falla de equipo…) · nº aviso ·
   autor.
4. **Operaciones o tareas** (lista): puesto de trabajo (lista desplegable) · descripción · tiempo
   planeado · **ejecutado (casilla)** · **tiempo ejecutado** · **observación**.
5. **Tiempo «no llave en mano»** (desviaciones, hasta 5): puesto de trabajo · descripción de la
   desviación (lista: aislamiento de proceso/eléctrico, retraso de permisos, espera de materiales,
   espera de transporte, causas externas…) · causado (casilla) · tiempo · observación.
6. **Tiempos:** labores (fecha/hora inicio y fin) · parada del equipo (fecha/hora inicio y fin) ·
   **horas fuera de servicio** (calculado) · **modo de falla** · **parte o componente que falló** ·
   **¿afecta la disponibilidad?** · avance de la actividad (%).
7. **Reporte:** ¿cómo encontró el equipo? · ¿qué actividades realizó? · ¿cómo entregó el equipo? ·
   recomendaciones/pendientes · registro fotográfico.
8. **Materiales reservados** (hasta 16): código SAP · descripción · cantidad · **¿se usó?**
9. **Firmas:** técnico(s) ejecutante(s) (hasta 5) · supervisor · fechas · correo adicional.

En **negrita** = lo que captura el técnico. El resto viene de SAP.

### 3.2 Pestañas de la base

| Pestaña | Origen | Filas aprox. | Contenido |
|---|---|---|---|
| `Ordenes_IW38` | SAP IW38 | 1 900 | Órdenes: nº, aviso, clase (ZPM1 correctivo, ZPM2 pruebas, ZPM3 inspecciones, ZPM4 preventivo), texto, fechas, equipo, ubicación técnica, ABC, estado, grupo de planificación (campo), autor, hoja de ruta, prioridad, tipo de mantenimiento, semana, sistema, área, tipo de equipo, fabricante, aviso, frecuencia |
| `Operaciones_IW48` | SAP IW48 | 25 500 | Operaciones por orden: nº operación (10, 20…), puesto de trabajo, texto, trabajo planeado, estado |
| `Materiales` | SAP reservas | 700 | Material reservado por orden: posición, código, texto breve, cantidad, unidad, almacén |
| `IH08` | SAP IH08 | 16 500 | **Maestro de equipos**: nº, TAG, ABC, denominación, tipo de objeto, estado, ubicación técnica, fabricante, tipo, serie, perfil de catálogo, emplazamiento, área, puesto responsable |
| `IP24 - P&P_LL34` | SAP IP24 + cálculos | 18 100 | **Plan preventivo**: plan, posición, hoja de ruta, frecuencia, mes, ¿toma lanzada?, estado de la orden, campo, sistema, subsistema, oficio |
| `Avisos P&P` | SAP | pocos | Avisos de falla: nº, clase, ABC, descripción, ubicación, parada, duración, autor, horas de avería, puesto responsable |
| `Datos 2` | **Relum la reemplaza** | 16 700 | Ejecuciones guardadas (actual) |
| `Datos`, `Datos 3` | igual | 9 000 / pocas | Versiones anteriores de `Datos 2` (más columnas: campo, actividad, equipo intervenido…) |
| `Usuarios` | manual | 2 | Correo, nombre, rol (Administrador / Operador) — no se usa en el script |
| `Referencias`, `Hoja 9` | manual | — | Catálogos: ABC, clases de orden, centros, emplazamientos, ubicaciones, **técnicos**, causas «no llave en mano» |

### 3.3 Qué guarda la ejecución (`Datos 2`, una fila por envío)

nº orden · fecha de envío · tiempo ejecutado de 17 operaciones fijas (posiciones 21–29 y 80–82 del
formato) · 5 tiempos «no llave en mano» · 4 textos del reporte · labores y parada (fecha/hora inicio y
fin) · afecta disponibilidad · horas fuera de servicio · modo de falla · parte que falló · avance ·
ejecutantes 1–5.

## 4. Problemas de la versión actual (lo que Relum debe resolver)

- **Un solo formato compartido:** si dos técnicos lo usan a la vez se pisan los datos.
- **Se pierden datos:** no se guardan la casilla «ejecutado», las observaciones por operación, las
  descripciones de las desviaciones, «¿se usó el material?», la frecuencia ni las firmas. Solo se guardan
  tiempos de 17 de las 62 operaciones posibles.
- **Fechas y horas sucias** (`30/12/1899`, horas como fracción de día, comas decimales).
- Depende de pegar exportaciones de SAP a mano; búsquedas sobre 90 000 filas en cada consulta.
- No está pensado para celular; las fotos solo viajan como adjuntos del correo (no quedan con la OT).
- Destinatarios del correo fijos en el código; sin historial consultable ni indicadores.
- Sin control de acceso real (la pestaña `Usuarios` no se usa).

## 5. Modelo propuesto para Relum (todo por empresa: `company_id`)

**Maestros (gratis):**
- `Asset` (equipo): código, TAG, descripción, criticidad ABC, tipo de equipo, fabricante, modelo, serie,
  ubicación técnica (`Location`), sistema, área, puesto responsable, estado.
- `Location` (ubicación técnica, jerárquica): código, denominación, padre, emplazamiento/campo.
- `WorkCenter` (puesto de trabajo / oficio): código, nombre.
- `Technician` (técnico): nombre, puesto, usuario de Relum opcional.
- Catálogos: `OrderType`, `NotificationType`, `DelayCause` (causas «no llave en mano»),
  `FailureMode`, `FailedPart`.

**Órdenes (gratis):**
- `WorkOrder`: número (propio o de SAP), aviso, tipo, actividad (programada/no programada), prioridad,
  descripción, equipo, fechas planeadas, semana, frecuencia, hoja de ruta, estado
  (abierta → en ejecución → enviada → cerrada), origen (manual / importada).
- `WorkOrderOperation`: nº, puesto, descripción, horas planeadas.
- `WorkOrderMaterial`: posición, código, descripción, cantidad reservada.

**Ejecución (gratis; es la materia prima de la parte de pago):**
- `WorkOrderExecution`: técnico que reporta, labores inicio/fin, parada inicio/fin (horas fuera de
  servicio calculadas), ¿afecta disponibilidad?, modo de falla, parte que falló, avance %, 4 textos del
  reporte, correo adicional, fecha de envío, firmas.
- `ExecutionOperation`: ejecutada sí/no, horas reales, observación — para **todas** las operaciones.
- `ExecutionDelay`: puesto, causa, causado sí/no, horas, observación.
- `ExecutionMaterial`: ¿se usó?, cantidad usada.
- `ExecutionTechnician`: técnicos que participaron (sin límite de 5).
- `Attachment`: fotos y documentos ligados a la OT (no solo al correo).

Con parada inicio/fin, modo de falla, equipo y ABC ya se pueden calcular **MTBF, MTTR y disponibilidad**
(parte de pago) sin pedir datos nuevos.

## 6. Equivalencia de funciones

| Hoja actual | En Relum |
|---|---|
| Pegar exportaciones de SAP | **Importar archivo** (Excel/CSV de IW38, IW48, materiales, IH08) con vista previa; también crear OT a mano para quien no tiene SAP |
| Escribir nº de orden + botón buscar | Lista «Mis órdenes» + buscador por número, TAG o equipo (celular primero) |
| Llenar el formato | Formulario por pasos de la ejecución, con fotos desde la cámara |
| Adjuntos + «Guardar y enviar» | Botón **Enviar orden**: guarda todo, genera PDF y lo envía por correo a destinatarios configurables por empresa |
| `Datos 2` | Historial de ejecuciones + **descargar Excel** para cargar a SAP |
| `Usuarios` | Usuarios, roles y empresas de Relum (ya existen) |
| Plan preventivo IP24 | Fase posterior (planes preventivos) |

## 7. Tareas para Codex (propuesta de orden)

| # | Tarea | Depende de |
|---|---|---|
| 015 | Tablas de mantenimiento (migración SQL) + catálogos iniciales | — |
| 016 | Importar exportaciones de SAP (IW38, IW48, materiales, IH08) con vista previa | 015 |
| 017 | Equipos: lista, buscador y ficha | 015 |
| 018 | Órdenes: «Mis órdenes», buscador y detalle | 015 |
| 019 | Reportar la ejecución (formulario por pasos, celular primero, fotos) | 018 |
| 020 | Enviar: PDF de la OT + correo a destinatarios configurables | 019 + proveedor de correo |
| 021 | Historial de ejecuciones + descargar Excel | 019 |
| 022 | Importar el historial de `Datos 2` | 015, 021 |

Pendiente de decidir con el dueño del producto: proveedor de correo para los envíos (en Coolify),
y si la primera empresa será la que hoy usa la hoja (datos reales de SAP) o una de prueba.
