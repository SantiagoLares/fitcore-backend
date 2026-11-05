# Contrato de la API · Fit_Core v1

Este documento define los endpoints de la API de Fit_Core, sus parámetros y el formato de sus respuestas, para que el front y el back puedan trabajar en paralelo.


## Índice

- [Convenciones generales](#convenciones-generales)
- [Autenticación](#autenticación)
- [Usuarios](#usuarios)
- [Alumnos](#alumnos)
- [Profesores](#profesores)
- [Clases](#clases)
- [Horarios](#horarios)
- [Inscripciones](#inscripciones)
- [Cuotas](#cuotas)
- [Pagos](#pagos)

---

## Convenciones generales

- Prefijo de todas las rutas: `/api/v1`.
- Formato: JSON. Los campos usan camelCase (`fechaAlta`), aunque en la base de datos estén en snake_case (`fecha_alta`).
- Fechas: `AAAA-MM-DD`. Horas: `HH:MM` (24 horas). Períodos de cuota: `AAAA-MM`.
- Montos: número con hasta dos decimales (por ejemplo, `15000.50`).
- Todas las rutas, salvo `POST /auth/login`, requieren el encabezado `Authorization: Bearer <token>`.

### Formato de respuesta

Lista paginada:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 10, "total": 47, "totalPages": 5 }
}
```

Un registro:

```json
{ "data": {} }
```

Error:

```json
{ "error": "Mensaje legible para mostrar al usuario" }
```

### Parámetros de listado

Todos los `GET` de listado aceptan estos parámetros, con las mismas reglas:

| Parámetro | Por defecto | Reglas |
|---|---|---|
| `page` | `1` | Entero mayor o igual a 1 |
| `limit` | `10` | Entero entre 1 y 100 |
| `sortBy` | Depende de la entidad | Solo los campos permitidos en cada entidad |
| `order` | `asc` | `asc` o `desc` |

- Si algún parámetro es inválido (`page=abc`, `limit=500`, un `sortBy` no permitido), la API responde `400`.
- Si se pide una página mayor que `totalPages`, la API responde `200` con `data: []` y el `meta` con el total real.
- Los filtros se aplican primero, después el orden y por último el corte de página. El `total` cuenta los registros después de filtrar.
- El filtro `search` busca coincidencias parciales, sin distinguir mayúsculas ni tildes.

### Códigos de estado

| Código | Cuándo |
|---|---|
| `200` | Consulta o modificación exitosa |
| `201` | Registro creado |
| `204` | Baja exitosa (respuesta sin contenido) |
| `400` | Datos o parámetros inválidos, o un dato del cuerpo apunta a un registro inexistente |
| `401` | No hay sesión iniciada, o el token es inválido o venció |
| `403` | La sesión no tiene permiso para esa acción |
| `404` | El registro de la ruta no existe |
| `409` | Conflicto con un dato único o con una regla del negocio |
| `500` | Error interno del servidor |

`404` se usa solo cuando no existe el recurso de la **ruta** (`/alumnos/99`). Si lo que no existe es un dato del **cuerpo** (por ejemplo, un `claseId` inválido al inscribir), la respuesta es `400`.

### Bajas

- **Baja lógica:** las entidades con historial (Usuarios y Alumnos) no se eliminan. `DELETE` cambia su estado y el registro se conserva.
- **Baja física:** el resto se elimina, siempre que no tenga registros que dependan de él. Si los tiene, la API responde `409` y explica el motivo.

### Permisos

| Perfil | Acceso |
|---|---|
| Administración | Todo |
| Profesor | Lectura de sus clases, sus horarios y las inscripciones a sus clases |
| Alumno | Lectura de sus propios datos, inscripciones, cuotas y pagos, y de la lista de clases y horarios |

Si una sesión intenta algo fuera de su perfil, la API responde `403`.

---

## Autenticación

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Inicia sesión | 200, 400, 401 |
| GET | `/api/v1/auth/me` | Datos del usuario de la sesión | 200, 401 |

### POST /auth/login

Cuerpo:

```json
{ "email": "admin@fitcore.com", "password": "secreto123" }
```

Respuesta `200`:

```json
{
  "data": {
    "token": "eyJhbGciOi...",
    "usuario": { "id": 1, "nombre": "Ana Pérez", "email": "admin@fitcore.com", "perfil": "Administración", "activo": true }
  }
}
```

- Email o contraseña incorrectos → `401`, con un mensaje que no aclara cuál de los dos falló.
- Usuario con `activo: false` → `401`.

### GET /auth/me

Devuelve `{ "data": usuario }` del usuario de la sesión, con la misma forma que en Usuarios, más el perfil asociado si lo tiene (`alumnoId` o `profesorId`).

---

## Usuarios

Solo Administración.

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/api/v1/usuarios` | Lista paginada | 200, 400 |
| GET | `/api/v1/usuarios/:id` | Detalle | 200, 400, 404 |
| POST | `/api/v1/usuarios` | Alta | 201, 400, 409 |
| PUT | `/api/v1/usuarios/:id` | Modificación | 200, 400, 404, 409 |
| DELETE | `/api/v1/usuarios/:id` | Baja lógica | 204, 400, 404, 409 |

### Campos

| Campo | Tipo | Notas |
|---|---|---|
| `id` | number | Lo genera el servidor |
| `nombre` | string | |
| `email` | string | Único |
| `perfil` | string | `Alumno`, `Profesor` o `Administración` |
| `activo` | boolean | |

La contraseña nunca se devuelve en ninguna respuesta.

### Listado

- `sortBy` permitido: `nombre` (por defecto), `email`.
- Filtros: `search` (nombre o email), `perfil`, `activo` (`true` o `false`).

### POST

```json
{ "nombre": "Ana Pérez", "email": "ana@mail.com", "password": "secreto123", "perfil": "Administración" }
```

- Todos los campos son obligatorios. La contraseña debe tener al menos 8 caracteres.
- El servidor guarda la contraseña cifrada y asigna `activo: true`.
- Email ya existente → `409`.

### PUT

Los mismos campos que el POST, más `activo`. `password` es opcional: si no se envía, no cambia.

### DELETE

Cambia `activo` a `false`; el usuario ya no puede iniciar sesión. Un usuario no puede darse de baja a sí mismo → `409`.

---

## Alumnos

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/api/v1/alumnos` | Lista paginada | 200, 400 |
| GET | `/api/v1/alumnos/:id` | Detalle | 200, 400, 404 |
| POST | `/api/v1/alumnos` | Alta | 201, 400, 409 |
| PUT | `/api/v1/alumnos/:id` | Modificación | 200, 400, 404, 409 |
| DELETE | `/api/v1/alumnos/:id` | Baja lógica | 204, 400, 404 |

### Campos

| Campo | Tipo | Notas |
|---|---|---|
| `id` | number | Lo genera el servidor |
| `usuarioId` | number | Usuario asociado |
| `dni` | string | Único |
| `nombre` | string | |
| `apellido` | string | |
| `email` | string | |
| `telefono` | string | |
| `fechaAlta` | string | La pone el servidor al crear |
| `estado` | string | `activo` o `baja` |

### Listado

- `sortBy` permitido: `apellido` (por defecto), `nombre`, `dni`, `fechaAlta`.
- Filtros: `search` (apellido, nombre o DNI), `estado`. Sin filtro de estado, devuelve todos.

Ejemplo: `GET /api/v1/alumnos?search=gomez&estado=activo&page=1&limit=10`

### POST

```json
{
  "usuarioId": 12,
  "dni": "40123456",
  "nombre": "Lucía",
  "apellido": "Gómez",
  "email": "lucia@mail.com",
  "telefono": "2915551234"
}
```

- Obligatorios: `usuarioId`, `dni`, `nombre`, `apellido`, `email`.
- El servidor asigna `id`, `fechaAlta` (fecha del día) y `estado: "activo"`.
- Usuario inexistente o con un perfil distinto de `Alumno` → `400`.
- DNI ya existente, o usuario que ya tiene un perfil de alumno → `409`.

### PUT

Los mismos campos que el POST, más `estado` (permite reactivar a un alumno dado de baja). Mismas validaciones.

### DELETE

Cambia el `estado` a `baja` y cancela sus inscripciones activas. Se conservan sus cuotas y pagos.

---

## Profesores

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/api/v1/profesores` | Lista paginada | 200, 400 |
| GET | `/api/v1/profesores/:id` | Detalle | 200, 400, 404 |
| POST | `/api/v1/profesores` | Alta | 201, 400, 409 |
| PUT | `/api/v1/profesores/:id` | Modificación | 200, 400, 404, 409 |
| DELETE | `/api/v1/profesores/:id` | Baja física | 204, 400, 404, 409 |

### Campos

| Campo | Tipo | Notas |
|---|---|---|
| `id` | number | Lo genera el servidor |
| `usuarioId` | number | Usuario asociado |
| `dni` | string | Único |
| `nombre` | string | |
| `apellido` | string | |
| `email` | string | |
| `telefono` | string | |
| `especialidad` | string | Por ejemplo, `Funcional` o `Yoga` |

El detalle (`GET /profesores/:id`) suma `clases`: una lista con `id` y `nombre` de las clases que dicta.

### Listado

- `sortBy` permitido: `apellido` (por defecto), `nombre`, `dni`, `especialidad`.
- Filtros: `search` (apellido, nombre o DNI), `especialidad`.

### POST

```json
{
  "usuarioId": 7,
  "dni": "30111222",
  "nombre": "Martín",
  "apellido": "López",
  "email": "martin@mail.com",
  "telefono": "2915559876",
  "especialidad": "Funcional"
}
```

- Obligatorios: `usuarioId`, `dni`, `nombre`, `apellido`, `email`, `especialidad`.
- Usuario inexistente o con un perfil distinto de `Profesor` → `400`.
- DNI ya existente, o usuario que ya tiene un perfil de profesor → `409`.

### PUT

Los mismos campos que el POST. Mismas validaciones.

### DELETE

Profesores no tiene campo de estado, así que la baja es física. Si el profesor tiene clases asignadas → `409` con el mensaje `"El profesor tiene clases asignadas. Reasigná o eliminá esas clases primero"`.

---

## Clases

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/api/v1/clases` | Lista paginada | 200, 400 |
| GET | `/api/v1/clases/:id` | Detalle | 200, 400, 404 |
| POST | `/api/v1/clases` | Alta | 201, 400 |
| PUT | `/api/v1/clases/:id` | Modificación | 200, 400, 404, 409 |
| DELETE | `/api/v1/clases/:id` | Baja física | 204, 400, 404, 409 |

### Campos

| Campo | Tipo | Notas |
|---|---|---|
| `id` | number | Lo genera el servidor |
| `nombre` | string | |
| `tipo` | string | Por ejemplo, `Funcional` o `Spinning` |
| `cupoMaximo` | number | Entero mayor o igual a 1 |
| `cuposOcupados` | number | Calculado: inscripciones activas |
| `cuposDisponibles` | number | Calculado: `cupoMaximo - cuposOcupados` |
| `profesor` | object | `{ id, nombre, apellido }` |

El detalle (`GET /clases/:id`) suma `horarios`: la lista de horarios de la clase, con la forma de Horarios.

### Listado

- `sortBy` permitido: `nombre` (por defecto), `tipo`, `cupoMaximo`, `cuposDisponibles`.
- Filtros: `search` (nombre), `tipo`, `profesorId`, `conCupo` (`true` devuelve solo clases con cupos disponibles).

### POST

```json
{
  "nombre": "Funcional mañana",
  "tipo": "Funcional",
  "cupoMaximo": 20,
  "profesorId": 3,
  "horarios": [
    { "diaSemana": "lunes", "horaInicio": "08:00", "horaFin": "09:00" },
    { "diaSemana": "miercoles", "horaInicio": "08:00", "horaFin": "09:00" }
  ]
}
```

- Todos los campos son obligatorios. Una clase se crea con al menos un horario, porque el DER define que toda clase se dicta en uno o más horarios.
- Profesor inexistente, o algún horario inválido (ver Horarios) → `400`.

### PUT

`nombre`, `tipo`, `cupoMaximo` y `profesorId`. Los horarios se modifican desde Horarios.

- `cupoMaximo` menor que los `cuposOcupados` actuales → `409`.

### DELETE

Elimina la clase y sus horarios. Si tiene inscripciones activas → `409`.

---

## Horarios

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/api/v1/horarios` | Lista paginada | 200, 400 |
| GET | `/api/v1/horarios/:id` | Detalle | 200, 400, 404 |
| POST | `/api/v1/horarios` | Alta | 201, 400 |
| PUT | `/api/v1/horarios/:id` | Modificación | 200, 400, 404 |
| DELETE | `/api/v1/horarios/:id` | Baja física | 204, 400, 404, 409 |

### Campos

| Campo | Tipo | Notas |
|---|---|---|
| `id` | number | Lo genera el servidor |
| `claseId` | number | |
| `diaSemana` | string | `lunes`, `martes`, `miercoles`, `jueves`, `viernes`, `sabado` o `domingo` |
| `horaInicio` | string | `HH:MM` |
| `horaFin` | string | `HH:MM`, posterior a `horaInicio` |

### Listado

- `sortBy` permitido: `diaSemana` (por defecto, en el orden de la semana), `horaInicio`.
- Filtros: `claseId`, `diaSemana`.

Ejemplo, para armar la grilla semanal: `GET /api/v1/horarios?limit=100`

### POST

```json
{ "claseId": 4, "diaSemana": "viernes", "horaInicio": "18:00", "horaFin": "19:00" }
```

- Todos los campos son obligatorios.
- Clase inexistente, día inválido, hora con formato incorrecto, o `horaFin` igual o anterior a `horaInicio` → `400`.

### PUT

`diaSemana`, `horaInicio` y `horaFin`. Mismas validaciones. No se puede cambiar de clase.

### DELETE

Si es el único horario de la clase → `409`, porque toda clase debe tener al menos un horario.

---

## Inscripciones

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/api/v1/inscripciones` | Lista paginada | 200, 400 |
| GET | `/api/v1/inscripciones/:id` | Detalle | 200, 400, 404 |
| POST | `/api/v1/inscripciones` | Inscribir a un alumno en una clase | 201, 200, 400, 409 |
| DELETE | `/api/v1/inscripciones/:id` | Cancelar | 204, 400, 404, 409 |

No hay `PUT`: una inscripción solo se crea o se cancela.

### Campos

| Campo | Tipo | Notas |
|---|---|---|
| `id` | number | Lo genera el servidor |
| `alumno` | object | `{ id, nombre, apellido }` |
| `clase` | object | `{ id, nombre }` |
| `fechaInscripcion` | string | La pone el servidor |
| `estado` | string | `activa` o `cancelada` |

### Listado

- `sortBy` permitido: `fechaInscripcion` (por defecto).
- Filtros: `alumnoId`, `claseId`, `estado`.

### POST

```json
{ "alumnoId": 15, "claseId": 4 }
```

- Alumno o clase inexistente → `400`.
- Alumno con estado `baja` → `409`.
- El alumno ya tiene una inscripción activa en esa clase → `409`.
- La clase no tiene cupos disponibles → `409`.
- Si existe una inscripción cancelada del mismo alumno en la misma clase, se reactiva (vuelve a `activa`, con fecha del día) y la respuesta es `200`, porque el DER no permite dos inscripciones del mismo alumno a la misma clase.

### DELETE

Cambia el `estado` a `cancelada` y libera el cupo. Si ya estaba cancelada → `409`.

---

## Cuotas

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/api/v1/cuotas` | Lista paginada | 200, 400 |
| GET | `/api/v1/cuotas/:id` | Detalle | 200, 400, 404 |
| POST | `/api/v1/cuotas` | Alta | 201, 400, 409 |
| PUT | `/api/v1/cuotas/:id` | Modificación | 200, 400, 404, 409 |
| DELETE | `/api/v1/cuotas/:id` | Baja física | 204, 400, 404, 409 |

### Campos

| Campo | Tipo | Notas |
|---|---|---|
| `id` | number | Lo genera el servidor |
| `alumno` | object | `{ id, nombre, apellido }` |
| `periodo` | string | `AAAA-MM`. Único por alumno: un alumno no puede tener dos cuotas del mismo período |
| `monto` | number | Mayor que 0 |
| `fechaVencimiento` | string | |
| `estado` | string | Calculado: `pagada`, `pendiente` o `vencida` |
| `pago` | object o null | `{ id, fechaPago, medioPago }` si está pagada |

El estado se calcula, no se guarda:

- `pagada`: tiene un pago registrado.
- `vencida`: no tiene pago y la fecha de hoy es posterior a `fechaVencimiento`.
- `pendiente`: no tiene pago y todavía no venció.

### Listado

- `sortBy` permitido: `fechaVencimiento` (por defecto), `periodo`, `monto`.
- Filtros: `alumnoId`, `estado`, `periodo`.

Ejemplo, cuotas vencidas: `GET /api/v1/cuotas?estado=vencida`

### POST

```json
{ "alumnoId": 15, "periodo": "2026-11", "monto": 25000, "fechaVencimiento": "2026-11-10" }
```

- Todos los campos son obligatorios.
- Alumno inexistente → `400`.
- El alumno ya tiene una cuota para ese período → `409`.

### PUT

`monto` y `fechaVencimiento`. Si la cuota ya está pagada → `409`.

### DELETE

Si la cuota ya está pagada → `409`.

---

## Pagos

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/api/v1/pagos` | Lista paginada | 200, 400 |
| GET | `/api/v1/pagos/:id` | Detalle | 200, 400, 404 |
| POST | `/api/v1/pagos` | Registrar el pago de una cuota | 201, 400, 409 |
| DELETE | `/api/v1/pagos/:id` | Anular | 204, 400, 404 |

No hay `PUT`: un pago mal cargado se anula y se registra de nuevo, para que quede trazabilidad.

### Campos

| Campo | Tipo | Notas |
|---|---|---|
| `id` | number | Lo genera el servidor |
| `cuota` | object | `{ id, periodo, alumno: { id, nombre, apellido } }` |
| `fechaPago` | string | |
| `monto` | number | |
| `medioPago` | string | `efectivo`, `transferencia`, `debito` o `credito` |
| `registradoPor` | object | `{ id, nombre }` del usuario que lo cargó |

### Listado

- `sortBy` permitido: `fechaPago` (por defecto), `monto`.
- Filtros: `cuotaId`, `alumnoId`, `medioPago`, `desde` y `hasta` (rango de `fechaPago`).

Ejemplo, pagos del mes: `GET /api/v1/pagos?desde=2026-11-01&hasta=2026-11-30&sortBy=fechaPago&order=desc`

### POST

```json
{ "cuotaId": 31, "monto": 25000, "medioPago": "efectivo", "fechaPago": "2026-11-05" }
```

- Obligatorios: `cuotaId`, `monto`, `medioPago`. Si no se envía `fechaPago`, se usa la fecha del día.
- `registradoPor` lo toma el servidor de la sesión; no se envía.
- Cuota inexistente, medio de pago inválido, o monto distinto del de la cuota → `400`.
- La cuota ya tiene un pago → `409`.

### DELETE

Elimina el pago y la cuota vuelve a quedar `pendiente` o `vencida`. Solo Administración.
