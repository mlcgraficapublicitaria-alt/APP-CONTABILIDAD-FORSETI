# FORSETI Renta Fiscal - Guia de uso

Esta seccion sirve para preparar y revisar expedientes de renta antes de que una persona con criterio fiscal tome decisiones finales. No presenta declaraciones automaticamente y no debe inventar datos.

## Expediente fiscal

Un expediente fiscal es la carpeta de trabajo de una renta concreta. Agrupa:

- contribuyente
- ejercicio fiscal
- documentos
- datos clave
- validaciones
- resumen preliminar
- auditoria de cambios

Ejemplo: renta de una persona para el ejercicio 2026.

## Dashboard de expedientes

Es la pantalla de entrada de Renta Fiscal. Muestra todos los expedientes y su estado:

- `Borrador`: expediente iniciado.
- `En revision`: expediente que se esta revisando.
- `Listo para revision`: expediente preparado para la comprobacion final.
- `Cerrado`: expediente terminado.

Desde aqui se crea un expediente nuevo o se abre uno existente.

## Checklist documental

Es la lista de documentos que normalmente hacen falta para revisar una renta.

Ejemplos:

- documento identificativo
- datos fiscales AEAT
- certificados de ingresos
- justificantes de deducciones
- cuenta bancaria

El checklist no calcula impuestos. Solo ayuda a saber si falta documentacion antes de avanzar.

## Documentos necesarios para preparar una renta

Lista clara para pedir al cliente o recopilar antes de revisar el expediente.

### Basicos casi siempre necesarios

- DNI, NIE o documento identificativo vigente.
- Datos fiscales de la AEAT del ejercicio correspondiente.
- Numero IBAN de la cuenta bancaria.
- Borrador o declaracion de renta del año anterior, si existe.
- Direccion fiscal actualizada.

### Ingresos del trabajo o pensiones

- Certificado de retenciones de la empresa.
- Certificado de pensiones, desempleo o prestaciones publicas.
- Informacion sobre atrasos, indemnizaciones o pagos extraordinarios.

### Autonomos o actividad economica

- Resumen anual de ingresos.
- Resumen anual de gastos deducibles.
- Modelos trimestrales presentados, si aplica.
- Libro de facturas emitidas y recibidas.
- Cuotas de autonomo y seguros relacionados con la actividad.

### Vivienda

- Referencia catastral de la vivienda habitual.
- Datos de hipoteca, si aplica.
- Justificantes de alquiler, si aplica.
- Certificado de retenciones del alquiler, si el contribuyente alquila un inmueble.
- Ingresos y gastos de inmuebles alquilados.
- Recibos de IBI, comunidad, seguros, reparaciones o suministros vinculados a alquiler.

### Inversiones y bancos

- Certificados bancarios de intereses.
- Informacion de dividendos.
- Operaciones de acciones, fondos, ETFs o similares.
- Ganancias o perdidas patrimoniales.
- Criptomonedas u otros activos digitales, si existen.

### Deducciones y reducciones

- Donativos.
- Cuotas sindicales o colegios profesionales.
- Planes de pensiones.
- Gastos de guarderia, familia numerosa o discapacidad, si aplica.
- Justificantes de deducciones autonomicas.
- Documentacion de maternidad, descendientes o ascendientes a cargo, si aplica.

### Cambios personales relevantes

- Matrimonio, separacion o divorcio.
- Nacimiento o adopcion de hijos.
- Cambio de domicilio.
- Compra o venta de vivienda.
- Herencias o donaciones.
- Cambio de residencia fiscal.

### Situaciones especiales

- Venta de inmuebles.
- Venta de vehiculos u otros bienes relevantes.
- Subvenciones o ayudas publicas.
- Premios, indemnizaciones o ingresos no habituales.
- Rentas del extranjero.

### Regla de seguridad

Si un documento no existe o el dato no esta confirmado, debe marcarse como pendiente. FORSETI no debe rellenar importes ni condiciones fiscales por intuicion.

## Documentos

Un documento es una prueba o soporte asociado al expediente.

En esta fase inicial solo se registra el documento de forma logica. La subida real de ficheros y almacenamiento privado quedan pendientes para la version operativa completa.

## Datos clave

Son datos importantes extraidos o introducidos para analizar la renta.

Cada dato tiene un estado de confianza:

- `Confirmado`: confirmado con documento o fuente fiable.
- `Estimado`: estimado, util para orientarse pero no definitivo.
- `Pendiente`: pendiente de confirmar.

Regla practica: si no hay fuente, debe quedar como `Pendiente`. FORSETI no debe inventar importes.

## Faltantes

Son cosas que todavia faltan para que el expediente sea revisable.

Ejemplos:

- falta DNI/NIE
- falta certificado de ingresos
- falta confirmar un dato clave

## Incidencias

Son avisos generados por las validaciones. Indican riesgos, bloqueos o puntos que requieren revision.

Tipos habituales:

- `Aviso`: aviso importante, pero no siempre bloqueante.
- `Error`: falta algo esencial o hay una contradiccion.
- `Informacion`: informacion util.

## Validaciones

Las validaciones revisan el expediente con reglas basicas:

- si faltan documentos obligatorios
- si falta NIF/NIE
- si hay datos clave pendientes
- si hay informacion insuficiente para avanzar

En esta fase no sustituyen a un asesor fiscal. Solo ordenan el trabajo y reducen olvidos.

## Refrescar informacion fiscal oficial

Las deducciones pueden cambiar segun:

- ejercicio fiscal
- comunidad autonoma
- situacion personal
- actividad economica
- vivienda
- familia
- discapacidad
- inversiones o donativos

Por eso FORSETI incluye un boton de refresco de informacion fiscal. Este boton comprueba fuentes oficiales de la Agencia Tributaria y muestra enlaces directos para revisar:

- deducciones generales y autonomicas
- modelo 303 de IVA
- modelo 130 de IRPF

La comprobacion no decide si una deduccion aplica. Solo ayuda a verificar que se esta consultando informacion oficial y actualizada antes de marcar un dato como confirmado.

Regla practica: si una deduccion parece posible pero no se ha comprobado con fuente oficial y documentos, debe quedar como pendiente.

## Analizar modelo 303

Si el contribuyente tiene actividad sujeta a IVA, puede subir el PDF del modelo 303 para una revision preliminar.

FORSETI puede ayudar a:

- comprobar si el PDF parece realmente un modelo 303
- detectar menciones a IVA deducible
- revisar si hay actividad, devolucion o compensacion
- cruzar el documento con el perfil fiscal del expediente
- proponer puntos de revision para facturas, gastos afectos y saldos pendientes

Esto sirve para mejorar la preparacion de la renta y evitar olvidos, especialmente en autonomos.

Importante: FORSETI no confirma automaticamente que un gasto sea deducible. Cada posible mejora debe contrastarse con:

- factura real
- libro registro
- afectacion a la actividad
- normativa vigente
- situacion personal y fiscal del contribuyente

## Analizar modelo 130

Si el contribuyente es autonomo o tiene actividad economica en estimacion directa, puede subir el PDF del modelo 130 para una revision preliminar de pagos fraccionados de IRPF.

FORSETI puede ayudar a:

- comprobar si el PDF parece realmente un modelo 130
- revisar señales de ingresos y gastos declarados
- detectar si faltan menciones claras a gastos deducibles
- comprobar retenciones soportadas
- revisar continuidad entre trimestres
- separar actividad economica de alquileres o inversiones si el perfil lo indica
- proponer puntos de revision para afinar la renta

Esto es util porque el modelo 130 puede adelantar pagos de IRPF durante el año. Si hay gastos deducibles no revisados, retenciones mal consideradas o conceptos mezclados, la renta final puede quedar menos afinada.

Importante: FORSETI no recalcula ni corrige el modelo oficial. Solo señala puntos que deben contrastarse con:

- facturas emitidas
- facturas recibidas
- libros registro
- retenciones aplicadas por clientes
- pagos fraccionados anteriores
- situacion fiscal real del contribuyente
- normativa vigente

## Resumen preliminar

El resumen preliminar explica el estado del expediente:

- cuantos documentos faltan
- cuantas incidencias hay
- cuantos datos estan confirmados, estimados o pendientes

No es una declaracion fiscal ni una recomendacion final. Es una vista interna para saber si el expediente esta maduro.

## Auditoria y trazabilidad

La auditoria registra acciones relevantes:

- creacion de expediente
- registro de documentos
- cambios en datos clave
- ejecucion de validaciones

Sirve para saber quien hizo que y cuando.

## Que NO hace esta fase

- No presenta la renta.
- No envia datos a terceros.
- No calcula una declaracion completa.
- No sustituye criterio fiscal profesional.
- No inventa datos ausentes.

## Flujo recomendado

1. Crear expediente.
2. Completar datos del contribuyente.
3. Revisar checklist documental.
4. Registrar documentos recibidos.
5. Añadir datos clave con estado `Confirmado`, `Estimado` o `Pendiente`.
6. Ejecutar validaciones.
7. Revisar faltantes e incidencias.
8. Leer el resumen preliminar.
9. Marcar como listo solo cuando no haya pendientes criticos.
