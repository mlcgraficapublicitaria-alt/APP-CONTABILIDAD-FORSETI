# BRIEF TÉCNICO — REFACTOR FORSETI PARA WEB + PWA iPHONE

## Contexto
FORSETI ya existe como webapp y está en uso. Debe seguir funcionando en escritorio como hasta ahora mientras se refactoriza internamente para dejarla preparada como base de:

- webapp de escritorio estable
- futura PWA instalable en iPhone
- posible app móvil real más adelante si hiciera falta

Este trabajo debe hacerse sin romper el uso operativo actual.

---

## Objetivo principal
Refactorizar la app de FORSETI para mejorar mantenibilidad, separación por capas y preparación móvil/PWA, manteniendo la funcionalidad actual.

---

## Restricción crítica
La funcionalidad visible de FORSETI debe mantenerse.

### Debe seguir funcionando igual:
- login
- logout
- recuperación de contraseña
- dashboard principal
- selector de mes
- navegación por secciones
- lectura de datos
- render de KPIs, resúmenes, tablas y bloques actuales
- uso habitual en escritorio vía webapp

### No permitido en esta fase:
- rediseño funcional
- renombrar secciones sin motivo
- alterar flujos existentes
- romper despliegue actual
- rehacer desde cero salvo justificación técnica muy sólida

---

## Stack actual detectado
- Next.js 16
- React 19
- TypeScript
- App Router
- Tailwind CSS
- auth simple por cookie y variables de entorno
- rutas API en `src/app/api/*`
- lógica de datos centralizada sobre todo en `src/lib/sheets.ts`

---

## Diagnóstico inicial
La app tiene una base aprovechable y no parece candidata a rehacerse desde cero.

### Puntos positivos
- stack moderno y válido para web + PWA
- estructura inicial ordenada
- auth encapsulada de forma básica
- navegación y secciones ya implementadas
- separación inicial entre UI y acceso a datos

### Puntos débiles a corregir
- `src/lib/sheets.ts` concentra demasiada lógica
- `src/app/page.tsx` es demasiado grande y mezcla presentación con composición compleja
- auth funcional pero básica para evolución futura
- no hay aún preparación PWA/iOS explícita
- responsive existe, pero hay que validarlo con criterio de uso real en iPhone

---

## Objetivo de arquitectura
Evolucionar FORSETI hacia una base donde:

- la web de escritorio siga estable
- la lógica esté modularizada
- la capa de datos sea mantenible y testeable
- la UI esté dividida por features y componentes
- la app pueda prepararse como PWA para iPhone sin romper la web actual

---

## Propuesta de estructura objetivo
Referencia orientativa, no dogma rígido:

```text
src/
  app/
    api/
    login/
    page.tsx
    layout.tsx
    globals.css
  features/
    auth/
      components/
      services/
      types/
    dashboard/
      components/
      services/
      selectors/
      types/
    months/
      components/
      services/
      types/
    pwa/
      services/
      types/
  components/
    ui/
  services/
    sheets/
    formatters/
    session/
  types/
```

La idea es separar por responsabilidad real, no mover archivos por mover.

---

## Fases de trabajo

## Fase 1 — Auditoría técnica y blindaje funcional
Antes de refactorizar:

### Documentar
- rutas reales
- dependencias
- flujo de login
- flujo de lectura de datos
- variables de entorno requeridas
- dependencias de despliegue

### Crear checklist de regresión funcional
Debe validar al menos:
- acceso correcto con login válido
- error correcto con login inválido
- cierre de sesión
- recuperación de contraseña
- carga del dashboard
- cambio de mes
- cambio de sección
- consistencia visual básica en escritorio
- consistencia visual básica en móvil

### Recomendación
Si se puede, generar capturas de referencia o checklist visual antes de tocar nada.

---

## Fase 2 — Refactor de capa de datos
Objetivo: descomponer `src/lib/sheets.ts`.

### Trabajo esperado
Separar al menos en piezas como:
- cliente/acceso a Google Sheets
- parsing CSV
- helpers de normalización
- formatters monetarios y temporales
- extractores de bloques de dashboard
- agregadores/factories de `DashboardData`

### Resultado esperado
- menos acoplamiento
- funciones más pequeñas
- lógica más testeable
- facilidad para reutilizar datos en web y móvil

### Importante
Mantener la salida funcional exacta o equivalente.

---

## Fase 3 — Refactor de la capa de UI/dashboard
Objetivo: reducir el tamaño y acoplamiento de `src/app/page.tsx`.

### Trabajo esperado
Extraer componentes por bloques funcionales, por ejemplo:
- cabecera/dashboard hero
- navegación de secciones
- tarjetas KPI
- bloque de resumen mensual
- bloque de pasivos
- bloque de ahorro
- bloque de inversión
- bloque de historial anual
- tablas o tarjetas auxiliares

### Criterio
Separar presentación, no alterar comportamiento.

---

## Fase 4 — Endurecer auth sin cambiar experiencia
Objetivo: dejar auth mejor encapsulada para evolución futura.

### Revisar
- `src/lib/auth.ts`
- rutas `api/login`, `api/logout`, `api/recover-password`
- manejo de errores
- cookie/session behavior
- compatibilidad en Safari/iPhone

### No hace falta en esta fase
Migrar ya a otro proveedor de autenticación, salvo que haya bloqueo serio.

---

## Fase 5 — Preparación PWA para iPhone
Sin romper la experiencia actual.

### Debe contemplar
- manifest web app
- iconos correctos
- apple touch icon
- metadatos Apple/iOS
- `theme-color`
- modo standalone
- revisión de viewport y safe areas
- service worker o estrategia PWA equivalente según stack elegido
- revisión de sesión al abrir desde pantalla de inicio en iPhone

### Importante
Esto no implica todavía cambiar la lógica funcional.

---

## Fase 6 — Estrategia de despliegue seguro
Hay que poder seguir usando FORSETI como webapp de escritorio durante el trabajo.

### Se espera propuesta concreta para:
- entorno local de desarrollo
- rama de trabajo
- validación antes de merge
- despliegue sin corte operativo
- rollback sencillo si algo falla

---

## Archivos actuales a revisar sí o sí
- `package.json`
- `next.config.ts`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/login/page.tsx`
- `src/app/login/login-form.tsx`
- `src/app/month-select.tsx`
- `src/app/section-nav.tsx`
- `src/app/api/login/route.ts`
- `src/app/api/logout/route.ts`
- `src/app/api/recover-password/route.ts`
- `src/lib/auth.ts`
- `src/lib/sheets.ts`
- `public/*` relacionado con iconos e imágenes de marca

---

## Entregables esperados de VÖLUNDR
VÖLUNDR debe devolver como mínimo:

1. diagnóstico técnico breve
2. arquitectura actual resumida
3. arquitectura objetivo propuesta
4. lista concreta de archivos a tocar
5. orden recomendado de implementación
6. riesgos de ruptura
7. plan de preparación PWA para iPhone
8. criterio de validación antes de producción

---

## Nivel de tecnicismo esperado
Este encargo debe bajarse a nivel útil para ejecución real en VS Code.

Eso implica:
- estructura concreta de carpetas
- decisiones de modularización
- naming razonable
- pasos de implementación
- orden de commits o fases
- criterios de prueba manual/local
- indicaciones de qué no tocar todavía

---

## Criterio de éxito
El trabajo será correcto si al final se cumple esto:

- FORSETI sigue funcionando como hasta ahora en escritorio
- el código queda más mantenible y modular
- la base queda preparada para PWA en iPhone
- no se rompe el uso diario
- queda claro el siguiente paso para móvil sin rehacer todo el proyecto

---

## Nota final
Este trabajo prioriza continuidad operativa.

Primero equivalencia funcional.
Después mejora estructural.
Después preparación PWA.

No al revés.
