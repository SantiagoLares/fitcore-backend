# Fitcore Backend

API de Fitcore desarrollada con Express y TypeScript.

## Ejecutar en local

Usá Node.js 20 y npm. Desde la raíz del repositorio, en PowerShell:

```powershell
npm ci
if (-not (Test-Path .env)) { Copy-Item sample.env .env }
npm run dev
```

`sample.env` documenta las variables `PORT` y `CORS_ORIGIN`.
El archivo `.env` es local y Git lo ignora.

Para compilar el proyecto, ejecutá `npm run build`.

## Respuestas de la API

`GET /api/v1/health` devuelve HTTP 200:

```json
{"success":true,"data":{"status":"ok","service":"fitcore-backend"},"error":null}
```

Una ruta inexistente devuelve HTTP 404:

```json
{"success":false,"data":null,"error":{"code":"NOT_FOUND","message":"Ruta no encontrada"}}
## Flujo de trabajo

Cada integrante trabaja en `alumno/nombre` y abre sus PR hacia `develop`.
`main` queda para versiones validadas.
