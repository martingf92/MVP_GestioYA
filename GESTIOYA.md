# GESTIOYA
## Proyecto ERP SaaS de Byte Ecosistemas
### Documento maestro de contexto para agente de desarrollo

---

# 1. IDENTIDAD DEL PROYECTO

## Empresa

**Byte Ecosistemas**

Byte Ecosistemas será la empresa responsable del desarrollo, comercialización y operación de los productos tecnológicos.

## Producto principal

**GestioYA**

GestioYA será un ERP SaaS orientado inicialmente al mercado argentino de pequeñas y medianas empresas.

La propuesta busca ofrecer una solución de gestión empresarial moderna, accesible, modular y fácil de utilizar, evitando la complejidad y los costos de implementación de algunos ERP tradicionales.

---

# 2. EQUIPO FUNDADOR

El proyecto está siendo desarrollado inicialmente por tres personas:

### Martín Gómez Franco
Responsabilidades principales:

- Dirección de negocio.
- Estrategia comercial.
- Marketing.
- Definición del modelo de negocio.
- Definición del MVP.
- Definición funcional del producto.
- Coordinación general del proyecto.
- Participación en la definición y desarrollo técnico del software.
- Validación del producto.
- Posteriormente, coordinación del desarrollo mediante DeepAgent de Abacus.ai.

### Martín Ristoff
Responsabilidades principales:

- UX/UI.
- Diseño visual del producto.
- Aplicación del UI Kit definido.
- Diseño del flujo de navegación.
- Prototipo navegable.
- Diseño de la demo comercial de GestioYA.
- Definición de la experiencia de usuario.

### Adrián Bonfanti
Responsabilidades principales:

- Investigación legal y administrativa.
- Investigación y definición preliminar de precios.
- Registro de marca.
- Material comercial.
- Procesos internos.
- Apoyo en cuestiones comerciales y operativas.
- Preparación de documentación necesaria para la futura comercialización.

---

# 3. ESTADO ACTUAL DEL PROYECTO

El proyecto todavía se encuentra en una etapa de definición y preparación previa al desarrollo completo.

Ya se realizó una primera reunión del equipo.

En esa reunión se definieron:

- Nombre de la empresa: **Byte Ecosistemas**.
- Nombre del ERP: **GestioYA**.
- UI Kit del producto.
- Servicio de correo electrónico corporativo mediante **DonWeb**.
- DonWeb será también utilizado para desplegar el sitio web corporativo.
- El sitio web será utilizado como presencia institucional de Byte Ecosistemas y como canal de promoción de GestioYA.

La estrategia actual es completar primero las definiciones fundamentales de producto, negocio, diseño y estructura empresarial.

Una vez que estas definiciones estén suficientemente consolidadas, se comenzará el desarrollo del ERP utilizando **DeepAgent de Abacus.ai**.

---

# 4. MERCADO OBJETIVO

## Mercado inicial

GestioYA se comercializará inicialmente exclusivamente en:

**Argentina**

No se contempla inicialmente una estrategia comercial para otros países.

La expansión regional podrá analizarse posteriormente.

## Cliente objetivo

El foco inicial está puesto en:

- Pequeñas empresas.
- Medianas empresas.
- Comercios.
- Distribuidores.
- Empresas que necesitan centralizar operaciones administrativas y comerciales.

El producto no debe diseñarse inicialmente pensando en grandes corporaciones con requerimientos extremadamente específicos.

La prioridad es:

**simplicidad + utilidad + precio competitivo + facilidad de adopción.**

---

# 5. MODELO COMERCIAL

GestioYA será un producto SaaS.

El cliente utilizará el software como servicio mediante una suscripción mensual.

No se plantea inicialmente vender una licencia perpetua tradicional.

El modelo previsto es:

**Software como servicio + suscripción mensual + funcionalidades diferenciadas por plan.**

Se considera utilizar planes escalonados:

- Básico
- Pro
- Enterprise

Sin embargo, la estructura definitiva de funcionalidades y precios todavía NO está cerrada.

---

# 6. MONEDA Y PRECIOS

La intención comercial definida es:

**El cliente pagará en pesos argentinos, pero el precio estará referenciado al dólar.**

Por lo tanto:

- La referencia económica interna será USD.
- La facturación/cobro al cliente argentino se realizará en ARS.
- El mecanismo exacto de actualización y tipo de cambio de referencia todavía debe definirse legal y contablemente.

Los precios NO deben considerarse definitivos durante el desarrollo.

Antes del lanzamiento comercial se realizará nuevamente un análisis competitivo y económico para establecer:

- Precio de cada plan.
- Límites de cada plan.
- Precio por usuario adicional, si corresponde.
- Precio de implementación/onboarding, si corresponde.
- Precio de funcionalidades adicionales.
- Condiciones de actualización.
- Costos de soporte.
- Costos de infraestructura.
- Margen esperado.

---

# 7. INVESTIGACIÓN DE MERCADO REALIZADA

Se realizó una primera investigación de soluciones ERP/gestión utilizadas en Argentina.

Entre las referencias analizadas se encontraron:

- Contabilium.
- SimplicIA.
- ISIS ERP.
- ERP Solutions Forest.
- Conquer.

El objetivo de esta investigación fue conocer:

- Rangos de precios.
- Funcionalidades.
- Segmentación.
- Modelo de planes.
- Posicionamiento.

La investigación sirvió como referencia inicial, pero NO debe utilizarse como especificación del producto.

Los precios serán revisados nuevamente antes del lanzamiento.

---

# 8. ESTRATEGIA DE PLANES SAAS

Se considera una arquitectura comercial basada en:

## Plan Básico

Orientado a empresas pequeñas que necesitan las funcionalidades esenciales.

## Plan Pro

Orientado a empresas que requieren mayor capacidad operativa, usuarios, automatizaciones, reportes e integraciones.

## Plan Enterprise

Orientado a empresas con necesidades avanzadas, mayor volumen, personalización, soporte prioritario y funcionalidades adicionales.

IMPORTANTE:

La separación definitiva entre los planes todavía NO está definida.

El sistema debe diseñarse de forma que sea posible habilitar/deshabilitar funcionalidades mediante permisos, configuración del tenant/empresa y/o feature flags.

No desarrollar tres productos independientes.

Debe existir:

**un único producto GestioYA con funcionalidades controladas por plan.**

---

# 9. ARQUITECTURA TECNOLÓGICA DEFINIDA

La documentación técnica existente establece el siguiente stack:

## Backend

**NestJS + Node.js**

Responsable de:

- API.
- Lógica de negocio.
- Autenticación/autorización.
- Gestión de entidades.
- Procesos.
- Integraciones.
- Webhooks.
- Servicios internos.

## ORM

**Prisma**

Para acceso y gestión de PostgreSQL.

## Base de datos

**PostgreSQL**

La documentación utiliza:

**pgvector**

para capacidades futuras relacionadas con embeddings/IA.

También utiliza:

**pg_trgm**

para búsqueda y comparación textual.

La documentación técnica define ambas extensiones. 

## Frontend

**Next.js + React**

El frontend será una aplicación web moderna.

La documentación inicial utiliza Next.js 14 y React 18 como base. 

## Cache / jobs

**Redis**

Se utilizará para:

- Cache.
- Jobs.
- Procesamientos asincrónicos.
- Recordatorios.
- Tareas programadas.

## Automatización

**n8n**

Se utilizará para:

- Automatizaciones.
- Integraciones externas.
- Workflows.
- Webhooks.
- Procesos que no necesitan estar acoplados directamente al core del ERP.

## Business Intelligence

**Metabase**

Se utilizará para:

- Dashboards.
- KPIs.
- Analítica.
- Reportes avanzados.
- Exploración de información.

La documentación plantea específicamente el uso de Metabase conectado a PostgreSQL. 

## Administración de base

**PgAdmin**

Para administración de PostgreSQL durante desarrollo/operación técnica.

## Contenedores

**Docker / Docker Compose**

Todo el entorno inicial está preparado para ejecutarse mediante Docker Compose.

La documentación contempla:

- PostgreSQL.
- Redis.
- API.
- Web.
- n8n.
- Metabase.
- PgAdmin.

Todos como servicios independientes dentro del entorno Docker. 

---

# 10. ESTRUCTURA INICIAL DEL PROYECTO

La documentación establece una estructura inicial:

```text
.
├── docker-compose.yml
├── .env.example
├── ops/
│   └── postgres/
│       └── init/
│           └── 001_extensions.sql
├── apps/
│   ├── api/
│   │   ├── Dockerfile.dev
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── .env.example
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── app.controller.ts
│   │       ├── app.service.ts
│   │       ├── health/
│   │       └── prisma/
│   └── web/
│       ├── Dockerfile.dev
│       ├── package.json
│       ├── next.config.js
│       ├── tsconfig.json
│       ├── .env.example
│       └── src/
│           └── app/
│               └── page.tsx
└── README.md
```

Esta estructura forma parte del Starter Kit técnico entregado para el proyecto. 

---

# 11. SERVICIOS DEL ENTORNO DE DESARROLLO

La documentación inicial contempla:

```text
PostgreSQL → localhost:5432
API        → localhost:3000
Web        → localhost:3001
n8n        → localhost:5678
Metabase   → localhost:3002
PgAdmin    → localhost:5050
Redis      → localhost:6379
```

El entorno puede levantarse mediante:

```bash
docker compose up -d --build
```

Y posteriormente ejecutar las migraciones mediante Prisma.

La documentación original define este flujo como el procedimiento inicial para levantar el entorno. 

---

# 12. MODELO DE DATOS INICIAL

El Starter Kit ya contiene un modelo inicial de Prisma.

Este modelo NO debe considerarse definitivo.

Debe evolucionar a medida que se defina el MVP.

Las entidades inicialmente contempladas son:

## Usuario

```text
Usuario
- id
- nombre
- email
- password
- activo
- creadoEn
```

Relación:

```text
Usuario → UsuarioRol → Rol
```

## Rol

Permite definir roles y permisos.

```text
Rol
- id
- nombre
```

## UsuarioRol

Relaciona usuarios con roles.

---

# 13. ENTIDAD

La documentación utiliza una entidad genérica:

```text
Entidad
- id
- nombre
- email
- telefono
- activo
- creadoEn
```

Esta entidad deberá evolucionar.

Potencialmente podrá representar conceptos como:

- Cliente.
- Proveedor.
- Contacto.
- Otras entidades comerciales.

La separación definitiva debe definirse durante el diseño del dominio.

---

# 14. PRODUCTO

Modelo inicial:

```text
Producto
- id
- nombre
- sku
- precioUnitario
- creadoEn
```

Deberá evolucionar para soportar el modelo real de inventario.

Potencialmente deberá contemplar:

- Código/SKU.
- Descripción.
- Precio de venta.
- Costo.
- Stock.
- Stock mínimo.
- Categoría.
- Marca.
- Unidad de medida.
- Estado.
- Impuestos.
- Variantes, si corresponden.
- Depósitos.

Estas funcionalidades todavía deben definirse dentro del MVP.

---

# 15. REMITOS

El modelo inicial contiene:

```text
Remito
- id
- numero
- tipo
- fecha
- entidadId
- estado
```

Tipos inicialmente considerados:

```text
E = Entrada
S = Salida
```

Cada remito contiene:

```text
DetalleRemito
- id
- remitoId
- productoId
- cantidad
- precioUnitario
- estado
```

El modelo inicial contempla remitos para clientes/proveedores y movimientos relacionados con productos.

---

# 16. CUENTAS CORRIENTES

El Starter Kit contempla:

```text
CuentaCorriente
- id
- entidadId
- saldo
```

Y:

```text
MovimientoCuenta
- id
- cuentaCorrienteId
- fecha
- tipo
- concepto
- monto
- saldoResultante
```

Los tipos contemplados inicialmente son:

```text
debe
haber
ajuste
```

Esto deberá convertirse posteriormente en un módulo formal de cuentas corrientes.

---

# 17. TAREAS Y NOTIFICACIONES

El modelo contempla:

```text
Tarea
- id
- titulo
- descripcion
- fechaVencimiento
- estado
- creadaPor
```

Y:

```text
Notificacion
- id
- tareaId
- canal
- fechaProgramada
- estado
```

Esto permite posteriormente construir:

- Recordatorios.
- Alertas.
- Tareas administrativas.
- Vencimientos.
- Notificaciones automatizadas.

Redis y n8n podrán participar en este sistema.

---

# 18. AUDITORÍA

El modelo inicial incluye:

```text
LogAccion
- id
- tabla
- registroId
- accion
- fecha
- usuarioId
- diffJson
```

Este componente es importante.

GestioYA debe poder registrar acciones relevantes realizadas por usuarios.

La auditoría deberá utilizarse especialmente para:

- Cambios de datos sensibles.
- Operaciones comerciales.
- Modificaciones de documentos.
- Cambios de configuración.
- Acciones administrativas.

---

# 19. MULTI-TENANCY

IMPORTANTE:

GestioYA es un SaaS.

Por lo tanto, el diseño debe contemplar desde el inicio que existan múltiples empresas utilizando la misma plataforma.

La arquitectura debe evitar mezclar datos entre empresas.

La implementación concreta de multi-tenancy todavía NO fue definida.

Debe analizarse y decidirse antes de construir gran cantidad de módulos.

Como principio:

```text
Empresa A
 ├── usuarios
 ├── clientes
 ├── proveedores
 ├── productos
 ├── ventas
 └── movimientos

Empresa B
 ├── usuarios
 ├── clientes
 ├── proveedores
 ├── productos
 ├── ventas
 └── movimientos
```

Los datos de una empresa jamás deben estar disponibles para otra.

---

# 20. AUTENTICACIÓN Y AUTORIZACIÓN

Debe existir:

- Login.
- Gestión de sesión.
- Usuarios.
- Roles.
- Permisos.
- Activación/desactivación de usuarios.
- Control de acceso por empresa.
- Control de acceso por módulo.

La documentación inicial contiene usuarios y roles, pero el sistema de permisos detallado todavía debe diseñarse.

---

# 21. ARQUITECTURA DE PLANES

Los planes comerciales no deben generar diferentes aplicaciones.

Debe existir una única aplicación.

Ejemplo conceptual:

```text
GestioYA
   │
   ├── Plan Básico
   │      ├── módulo A
   │      ├── módulo B
   │      └── módulo C
   │
   ├── Plan Pro
   │      ├── módulo A
   │      ├── módulo B
   │      ├── módulo C
   │      ├── módulo D
   │      └── módulo E
   │
   └── Plan Enterprise
          ├── todo Pro
          ├── módulo F
          ├── módulo G
          └── funcionalidades avanzadas
```

Se recomienda que el acceso se determine mediante configuración del tenant.

Conceptualmente:

```text
Tenant
 ├── plan
 ├── features habilitadas
 ├── límites
 └── configuración
```

No crear forks del código por plan.

---

# 22. FEATURE FLAGS / CAPACIDADES

La arquitectura debería permitir determinar si una empresa tiene acceso a determinada funcionalidad.

Ejemplo:

```text
feature:
    inventory = true

feature:
    advanced_reports = false

feature:
    automation = true
```

Esto permitirá:

- Activar funcionalidades por plan.
- Realizar pruebas beta.
- Habilitar funcionalidades para determinados clientes.
- Lanzar módulos progresivamente.
- Realizar experimentos comerciales.

La implementación concreta queda pendiente de diseño técnico.

---

# 23. FRONTEND

El frontend se desarrollará con:

- Next.js.
- React.
- TypeScript.
- UI Kit definido por Martín Ristoff.

La interfaz debe ser:

- Clara.
- Moderna.
- Profesional.
- Simple.
- Responsive.
- Orientada a usuarios de pymes.
- Fácil de aprender.

No diseñar una interfaz excesivamente compleja únicamente porque sea técnicamente posible.

El usuario final probablemente no quiere contemplar la belleza de nuestra arquitectura mientras intenta cargar una factura.

---

# 24. UX/UI

Martín Ristoff es responsable del diseño.

Ya se definió un UI Kit.

Actualmente debe avanzar:

1. Prototipo navegable.
2. Flujos principales.
3. Dashboard.
4. Login.
5. Pantallas principales del MVP.
6. Demo visual del producto.

La demo debe permitir mostrar el concepto de GestioYA comercialmente incluso antes de que todo el backend esté terminado.

---

# 25. MVP

El MVP todavía debe terminar de definirse.

La responsabilidad principal de su definición está en Martín Gómez Franco.

El MVP debe priorizar funcionalidades que permitan que una pyme pueda realmente utilizar GestioYA para gestionar su operación.

La documentación inicial menciona como siguientes módulos:

- Entidades.
- Productos.
- Remitos.
- Cuentas.
- Tareas.

También contempla:

- Webhooks.
- Automatizaciones.
- KPIs.
- Metabase.
- Jobs mediante Redis/BullMQ.

Esto es arquitectura y roadmap potencial, NO significa que todo deba formar parte del MVP. 

---

# 26. FUNCIONALIDADES POTENCIALES DEL ERP

A partir de lo discutido y del modelo inicial, las áreas principales consideradas son:

## Administración

- Empresas.
- Usuarios.
- Roles.
- Permisos.
- Configuración.

## Clientes y proveedores

- Alta.
- Edición.
- Datos fiscales/comerciales.
- Historial.
- Cuenta corriente.

## Productos

- Catálogo.
- SKU.
- Precios.
- Stock.
- Categorías.
- Depósitos.

## Remitos

- Remitos de entrada.
- Remitos de salida.
- Detalles.
- Estados.
- Movimientos de stock.

## Cuentas corrientes

- Débitos.
- Créditos.
- Ajustes.
- Saldo.
- Historial.

## Tareas

- Tareas.
- Vencimientos.
- Estados.
- Recordatorios.
- Notificaciones.

## Reportes

- KPIs.
- Reportes operativos.
- Reportes comerciales.
- Dashboards.

## Automatizaciones

- n8n.
- Webhooks.
- Jobs.
- Notificaciones.

## BI

- Metabase.
- Dashboards avanzados.

---

# 27. INTELIGENCIA ARTIFICIAL

PostgreSQL está preparado con pgvector.

Esto fue incluido en el Starter Kit para permitir futuras capacidades relacionadas con:

- Embeddings.
- Búsqueda semántica.
- IA.
- Asistentes.
- Automatizaciones inteligentes.

IMPORTANTE:

No convertir la IA en una excusa para meter un chatbot en cada botón.

Primero debe existir un ERP útil.

Las capacidades de IA deben incorporarse posteriormente donde realmente aporten valor.

---

# 28. N8N

n8n será parte de la arquitectura para automatizaciones.

Casos potenciales:

```text
ERP
 ↓
Webhook
 ↓
n8n
 ↓
Acción externa
```

Ejemplos potenciales:

- Envío de emails.
- Recordatorios.
- Integraciones.
- Notificaciones.
- Sincronización.
- Procesos programados.

La documentación menciona específicamente webhooks como:

```text
/webhooks/remitos
/webhooks/obligaciones
```

como ejemplos de futuras integraciones. 

---

# 29. REDIS

Redis tendrá funciones relacionadas con:

- Cache.
- Jobs.
- Procesamientos asincrónicos.
- Recordatorios.
- Tareas programadas.

La documentación contempla posteriormente BullMQ sobre Redis para jobs. 

---

# 30. METABASE

Metabase será utilizado como componente de BI.

Debe poder conectarse a PostgreSQL.

La documentación contempla:

- Dashboards.
- KPIs.
- Vistas materializadas.
- Consultas específicas.

Una posibilidad contemplada es:

```text
PostgreSQL
      ↓
vistas / consultas / KPIs
      ↓
Metabase
      ↓
Dashboard
```

Esto debe evolucionar según las necesidades reales del MVP.

---

# 31. SITIO WEB

El sitio web corporativo será:

**Byte Ecosistemas**

Se desplegará en DonWeb.

Debe funcionar como:

- Sitio institucional.
- Presentación de la empresa.
- Presentación de GestioYA.
- Canal comercial.
- Generación de leads.

La web debería contemplar como mínimo:

```text
Inicio
Empresa
GestioYA
Funcionalidades
Planes
Contacto
```

Secciones adicionales como blog, casos de éxito y recursos pueden incorporarse posteriormente.

---

# 32. REDES SOCIALES

Se decidió crear presencia de Byte Ecosistemas.

Canales contemplados:

- LinkedIn.
- Instagram.
- Facebook.

El objetivo inicial es construir presencia y confianza antes del lanzamiento comercial.

El contenido debería estar orientado principalmente a:

- Gestión empresarial.
- Digitalización de pymes.
- Productividad.
- Automatización.
- Tecnología.
- Casos de uso de GestioYA.
- Educación empresarial.

---

# 33. CORREO CORPORATIVO

Se definió utilizar:

**DonWeb**

para el servicio de correo electrónico corporativo.

Se deberán crear cuentas individuales para los integrantes y cuentas funcionales de la empresa.

Ejemplos conceptuales:

```text
martin@...
adrian@...
martin.r@...

info@...
contacto@...
soporte@...
ventas@...
```

Los nombres exactos de las cuentas deben definirse según el dominio adquirido.

---

# 34. GESTIÓN DE CONTRASEÑAS

Se planteó utilizar una bóveda de contraseñas compartida.

La herramienta considerada inicialmente fue:

**LastPass**

También se analizaron alternativas como:

- 1Password.
- Zoho.
- Proton.

El objetivo es que los tres integrantes puedan administrar de manera segura:

- Cuentas.
- Redes.
- Hosting.
- Dominios.
- Servicios cloud.
- Herramientas de desarrollo.
- Credenciales administrativas.

No se deben almacenar contraseñas críticas en documentos de texto, chats o repositorios.

---

# 35. ESTRUCTURA EMPRESARIAL

Actualmente se decidió comenzar de manera liviana.

Martín Gómez Franco es monotributista.

La estrategia definida es validar primero el negocio y posteriormente evaluar la constitución de una sociedad.

La figura societaria considerada es principalmente:

**SAS**

También se analizó:

**SRL**

La constitución de la empresa se evaluará cuando exista suficiente tracción comercial y/o razones legales, financieras u operativas para justificarla.

IMPORTANTE:

La situación fiscal, facturación, contratos, propiedad intelectual y estructura societaria deberán ser validadas con un profesional argentino.

Este documento NO constituye asesoramiento jurídico ni tributario.

---

# 36. PROPIEDAD INTELECTUAL Y MARCA

Se decidió avanzar con la protección de:

- GestioYA.
- Byte Ecosistemas.

Adrián Bonfanti está encargado de investigar y avanzar con el registro ante:

**INPI**

Antes de presentar cualquier solicitud debe verificarse disponibilidad y clases correspondientes.

---

# 37. CONTRATOS

Antes de la comercialización deberán existir como mínimo:

- Términos y condiciones.
- Política de privacidad.
- Contrato/licencia o condiciones de suscripción SaaS.
- Condiciones de pago.
- Política de cancelación.
- Tratamiento de datos.
- Responsabilidades del proveedor.
- Limitaciones de responsabilidad.
- Condiciones de soporte.
- Condiciones de disponibilidad del servicio.

Todo esto debe ser revisado por un profesional legal argentino antes de utilizarse comercialmente.

---

# 38. DATOS Y SEGURIDAD

GestioYA manejará potencialmente información sensible desde el punto de vista comercial y operativo.

La arquitectura debe considerar:

- Aislamiento entre empresas.
- Autenticación segura.
- Autorización.
- Hash seguro de contraseñas.
- HTTPS.
- Gestión de sesiones.
- Protección de API.
- Validación de entradas.
- Logs.
- Auditoría.
- Backups.
- Recuperación ante desastres.
- Gestión de secretos.
- Control de acceso administrativo.

Los datos empresariales de un tenant jamás deben ser accesibles por otro tenant.

---

# 39. BACKUPS

La arquitectura debe contemplar backups de:

- PostgreSQL.
- Configuraciones importantes.
- Archivos necesarios para la operación.

También debe definirse:

- Frecuencia.
- Retención.
- Ubicación.
- Cifrado.
- Procedimiento de restauración.
- Pruebas periódicas de recuperación.

Un backup que nunca fue restaurado en una prueba es, técnicamente, una esperanza con nombre de archivo.

---

# 40. AMBIENTES

Se recomienda separar:

```text
Development
Testing / Staging
Production
```

No utilizar producción como entorno de desarrollo.

La arquitectura debe permitir que cada ambiente tenga:

- Variables independientes.
- Bases de datos independientes.
- Credenciales independientes.
- Configuración independiente.

---

# 41. GIT Y CONTROL DE VERSIONES

El código deberá mantenerse en un repositorio privado.

Se recomienda trabajar con:

```text
main
develop
feature/*
fix/*
```

o una estrategia equivalente.

Debe existir:

- Pull requests.
- Revisión de cambios.
- Commits claros.
- Issues.
- Tags/releases.

DeepAgent debe trabajar sobre el repositorio y respetar la estructura establecida.

---

# 42. PRINCIPIOS DE DESARROLLO

El agente de desarrollo debe seguir estos principios:

1. No inventar funcionalidades que no fueron solicitadas.
2. No modificar decisiones de negocio sin documentarlas.
3. Priorizar MVP.
4. Mantener arquitectura modular.
5. Evitar sobreingeniería.
6. Mantener separación clara entre frontend, backend e infraestructura.
7. Escribir código mantenible.
8. Validar entradas.
9. Implementar tests en funcionalidades críticas.
10. Mantener documentación.
11. Diseñar para multi-tenancy.
12. Diseñar para planes SaaS.
13. Mantener auditoría.
14. Evitar duplicación de lógica.
15. Mantener seguridad como requisito desde el inicio.

---

# 43. PRINCIPIO FUNDAMENTAL DEL DESARROLLO

No construir primero "todo el ERP".

Construir progresivamente:

```text
Fundación
   ↓
Autenticación
   ↓
Multi-tenancy
   ↓
Usuarios / roles
   ↓
Módulo principal del MVP
   ↓
Integración entre módulos
   ↓
Reportes
   ↓
Automatizaciones
   ↓
Planes SaaS
   ↓
Beta
   ↓
Feedback
   ↓
Iteración
```

---

# 44. ROADMAP DE PRODUCTO

## Fase 0 - Definición

Estado actual.

Debe completarse:

- MVP.
- Flujos.
- Reglas de negocio.
- UX/UI.
- Prototipo.
- Modelo comercial.
- Identidad de marca.
- Presencia web.
- Aspectos legales básicos.

## Fase 1 - Fundación técnica

- Repository.
- Docker.
- PostgreSQL.
- Prisma.
- NestJS.
- Next.js.
- Redis.
- n8n.
- Metabase.
- Autenticación.
- Multi-tenancy.
- Roles.
- Permisos.

## Fase 2 - MVP

Implementar solamente funcionalidades definidas en el MVP.

## Fase 3 - Integraciones

- Automatizaciones.
- Webhooks.
- n8n.
- Integraciones externas.

## Fase 4 - BI

- KPIs.
- Reportes.
- Metabase.

## Fase 5 - SaaS

- Planes.
- Límites.
- Features.
- Suscripciones.
- Administración de cuentas.

## Fase 6 - Beta

Probar con empresas reales.

## Fase 7 - Lanzamiento

- Web.
- Marketing.
- Ventas.
- Soporte.
- Onboarding.
- Facturación.

---

# 45. METODOLOGÍA DEL EQUIPO

El equipo planea reunirse aproximadamente cada:

**7 a 10 días**

para revisar:

- Tareas.
- Avances.
- Bloqueos.
- Decisiones.
- Producto.
- Diseño.
- Negocio.

Las decisiones importantes deben quedar documentadas.

---

# 46. TAREAS ACTUALES POR PERSONA

## Martín Gómez Franco

Actualmente responsable de:

### Producto
- Definir MVP.
- Definir módulos.
- Definir funcionalidades.
- Definir prioridades.
- Definir reglas de negocio.

### Web
- Crear sitio web de Byte Ecosistemas.
- Integrar presentación de GestioYA.
- Definir estructura comercial de la web.

### Redes
- Crear perfiles.
- Configurar identidad.
- Preparar estrategia inicial de contenido.

### Comercial
- Dirección comercial.
- Modelo de negocio.
- Estrategia de lanzamiento.

### Tecnología
- Participar en definición y desarrollo del ERP.
- Coordinar el trabajo con DeepAgent.

---

# 47. TAREAS ACTUALES DE ADRIÁN BONFANTI

### Pricing

Investigar y proponer:

- Precio Básico.
- Precio Pro.
- Precio Enterprise.
- Límites.
- Usuarios.
- Funcionalidades.
- Costos adicionales.

### Legal

Avanzar en:

- Registro de GestioYA.
- Registro de Byte Ecosistemas.
- Investigación SAS vs SRL.
- Contratos.
- Documentación legal.

### Comercial

Preparar:

- One-pager.
- Presentación comercial.
- Material institucional.
- Propuesta comercial inicial.

---

# 48. TAREAS ACTUALES DE MARTÍN RISTOFF

### UX/UI

- Prototipo navegable.
- Flujos principales.
- Pantallas del MVP.
- Aplicación del UI Kit.

### Demo

Diseñar una demo visual de GestioYA.

Debe permitir explicar:

```text
¿Qué es GestioYA?
¿Qué problema resuelve?
¿Cómo funciona?
¿Qué puede hacer una empresa?
¿Cómo se ve?
```

---

# 49. OBJETIVO DE LA PRÓXIMA REUNIÓN

La próxima reunión debe permitir revisar:

1. MVP definido.
2. Prototipo navegable.
3. Demo.
4. Sitio web.
5. Redes.
6. Pricing preliminar.
7. Material comercial.
8. Avance de marca.
9. Arquitectura técnica.
10. Decisiones pendientes.

---

# 50. QUÉ NO ESTÁ DEFINIDO TODAVÍA

El agente NO debe asumir que estas cuestiones están decididas:

- Precio definitivo.
- Planes definitivos.
- Módulos definitivos del MVP.
- Arquitectura final de multi-tenancy.
- Sistema definitivo de permisos.
- Sistema definitivo de suscripciones.
- Pasarela de pagos.
- Facturación electrónica.
- Integración con AFIP.
- Integración Mercado Pago.
- Integración Mercado Libre.
- Integraciones ecommerce.
- Hosting de producción definitivo del ERP.
- Política definitiva de backups.
- SLA.
- Soporte definitivo.
- Contrato definitivo.
- Política de privacidad definitiva.
- Constitución definitiva de la sociedad.
- Fecha definitiva de lanzamiento.

Estas cuestiones deben aparecer como **decisiones pendientes**, no como funcionalidades ya aprobadas.

---

# 51. DECISIONES TÉCNICAS QUE EL AGENTE DEBE PROPONER ANTES DE IMPLEMENTAR

Antes de comenzar una implementación importante, DeepAgent deberá identificar y documentar decisiones como:

### Multi-tenancy

Elegir entre:

- Shared database / shared schema.
- Shared database / schema por tenant.
- Database por tenant.

La decisión debe considerar:

- Costo.
- Escalabilidad.
- Seguridad.
- Complejidad.
- Cantidad esperada de clientes.

### Autenticación

Definir:

- JWT/session.
- Refresh tokens.
- Expiración.
- Recuperación de contraseña.
- MFA futuro.

### Autorización

Definir:

- RBAC.
- Permisos granulares.
- Permisos por módulo.
- Permisos por acción.

### Planes

Definir:

```text
Plan
 ↓
Features
 ↓
Limits
 ↓
Tenant
```

### Jobs

Definir:

```text
Redis
 +
BullMQ
```

para procesos asincrónicos.

### Integraciones

Definir interfaces desacopladas para evitar que las integraciones externas contaminen el dominio principal.

---

# 52. REGLA SOBRE CAMBIOS ARQUITECTÓNICOS

Si DeepAgent considera necesario cambiar:

- Framework.
- Base de datos.
- Arquitectura.
- Estructura del proyecto.
- Servicios.
- Modelo multi-tenant.

debe:

1. Explicar por qué.
2. Explicar ventajas.
3. Explicar desventajas.
4. Indicar impacto.
5. Esperar aprobación antes de realizar un cambio estructural importante.

No modificar la arquitectura arbitrariamente.

---

# 53. REGLA SOBRE FUNCIONALIDADES

Cuando exista una funcionalidad no definida:

```text
NO INVENTAR.
```

Debe registrarse como:

```text
DECISIÓN PENDIENTE
```

y continuar con las partes que sí estén definidas.

Cuando haya ambigüedad técnica, el agente puede proponer alternativas.

---

# 54. PRIORIDAD DEL PRODUCTO

Las prioridades son:

### P0
Necesario para que GestioYA funcione.

### P1
Importante para que el MVP sea comercialmente viable.

### P2
Mejora importante pero no bloquea lanzamiento.

### P3
Funcionalidad futura.

El agente debe evitar que funcionalidades P2/P3 retrasen P0/P1.

---

# 55. OBJETIVO FINAL

Crear un ERP SaaS argentino bajo la marca:

**GestioYA**

propiedad de:

**Byte Ecosistemas**

orientado inicialmente a:

**PyMEs argentinas**

con una arquitectura:

```text
Next.js
   ↓
NestJS API
   ↓
Prisma
   ↓
PostgreSQL
   ├── pg_trgm
   └── pgvector

Redis
   ↓
Jobs / Cache

n8n
   ↓
Automatizaciones / Integraciones

Metabase
   ↓
BI / Dashboards
```

Todo debe estar preparado para evolucionar hacia un SaaS multi-tenant, modular y con planes comerciales escalonados.

---

# 56. PRIMER OBJETIVO DEL AGENTE

Antes de escribir grandes cantidades de código:

1. Analizar este documento.
2. Analizar el Starter Kit existente.
3. Analizar `ERP_Documentacion_Completa.pdf`.
4. Inspeccionar la estructura actual del repositorio.
5. Identificar qué ya existe.
6. Identificar qué falta.
7. Crear un backlog técnico.
8. Separar:
   - MVP.
   - Post-MVP.
   - Futuro.
9. Detectar decisiones arquitectónicas pendientes.
10. Proponer un orden de implementación.
11. No comenzar funcionalidades grandes hasta tener clara la arquitectura base.

---

# 57. PRIMER ENTREGABLE DEL AGENTE

El primer entregable NO debe ser simplemente código.

Debe generar un documento técnico que contenga:

```text
1. Estado actual del proyecto
2. Arquitectura propuesta
3. Estructura de módulos
4. Modelo de datos
5. Estrategia multi-tenant
6. Autenticación
7. Autorización
8. Sistema de planes
9. APIs principales
10. Estructura frontend
11. Jobs
12. Automatizaciones
13. BI
14. Seguridad
15. Testing
16. Deployment
17. Backups
18. Observabilidad
19. Roadmap
20. Riesgos
21. Decisiones pendientes
```

Después de revisar ese documento, se podrá comenzar la implementación.

---

# 58. PRINCIPIO GENERAL

GestioYA no debe ser diseñado simplemente como "un software de gestión".

Debe ser diseñado como:

**un producto SaaS comercializable, escalable y mantenible.**

Por lo tanto, cada decisión técnica debe evaluarse también desde:

- Costo.
- Experiencia de usuario.
- Seguridad.
- Escalabilidad.
- Soporte.
- Comercialización.
- Capacidad de agregar funcionalidades.
- Capacidad de manejar diferentes planes.
- Facilidad de mantenimiento.

La arquitectura debe servir al negocio.

No construir una catedral de microservicios para tres clientes y un gato. Primero producto, después complejidad.

---

# 59. CONTEXTO FINAL PARA EL AGENTE

El proyecto está siendo construido por un equipo pequeño de tres personas.

Por lo tanto, las decisiones deben favorecer:

- Velocidad de desarrollo.
- Simplicidad.
- Automatización.
- Bajo costo operativo.
- Mantenibilidad.
- Capacidad de escalar posteriormente.

No se busca construir desde el día uno una plataforma comparable en complejidad interna con SAP.

Se busca construir un producto sólido para validar mercado y posteriormente escalar.

La primera versión debe ser suficientemente buena para que una pyme pueda utilizarla en una situación real.

El desarrollo será iterativo.

La estrategia será:

```text
Definir
 ↓
Diseñar
 ↓
Construir
 ↓
Probar
 ↓
Validar con clientes
 ↓
Medir
 ↓
Mejorar
 ↓
Escalar
```

---

# FIN DEL CONTEXTO

Nombre del producto: GESTIOYA

Empresa: BYTE ECOSISTEMAS

Mercado inicial: ARGENTINA

Segmento: PYME

Modelo: SAAS

Moneda comercial: ARS referenciado a USD

Planes previstos: BÁSICO / PRO / ENTERPRISE

Frontend: NEXT.JS + REACT

Backend: NESTJS

ORM: PRISMA

Base de datos: POSTGRESQL

Cache/Jobs: REDIS

Automatizaciones: N8N

BI: METABASE

Contenedores: DOCKER

Diseño: UI KIT YA DEFINIDO

Correo corporativo: DONWEB

Web corporativa: DONWEB

Desarrollo previsto: DEEPAGENT DE ABACUS.AI

Equipo:

- MARTÍN GÓMEZ FRANCO: PRODUCTO / NEGOCIO / COMERCIAL / MARKETING / TECNOLOGÍA
- MARTÍN RISTOFF: UX/UI / PROTOTIPO / DEMO
- ADRIÁN BONFANTI: LEGAL / PRICING / MATERIAL COMERCIAL / PROCESOS

Estado:

PRE-DESARROLLO / DEFINICIÓN DEL MVP

Objetivo inmediato:

CONVERTIR LAS DEFINICIONES EXISTENTES EN UNA ESPECIFICACIÓN TÉCNICA Y FUNCIONAL QUE PERMITA COMENZAR EL DESARROLLO DE GESTIOYA SIN INVENTAR REQUISITOS.