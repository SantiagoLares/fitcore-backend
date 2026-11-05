import type { Response } from "express";
import type { ApiSuccess } from "./contratos.js";

export function sendSuccess<T>(res: Response, data: T, status = 200) {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    error: null,
  };

  return res.status(status).json(body);
}