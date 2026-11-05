import type { ErrorRequestHandler, RequestHandler } from "express";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, "NOT_FOUND", "Ruta no encontrada"));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  let error: HttpError;

  if (err instanceof HttpError && err.status >= 400 && err.status < 500) {
    error = err;
  } else if (err?.type === "entity.parse.failed") {
    error = new HttpError(400, "INVALID_JSON", "El cuerpo de la solicitud no es JSON válido");
  } else if (err?.type === "entity.too.large") {
    error = new HttpError(413, "PAYLOAD_TOO_LARGE", "El cuerpo de la solicitud es demasiado grande");
  } else {
    console.error(err);
    error = new HttpError(500, "INTERNAL_ERROR", "Error interno del servidor");
  }

  res.status(error.status).json({
    success: false,
    data: null,
    error: {
      code: error.code,
      message: error.message,
    },
  });
};