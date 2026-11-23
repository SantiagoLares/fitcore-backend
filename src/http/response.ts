import type { Response } from "express";
import type {
  ItemResponse,
  PaginatedResponse,
} from "./contratos.js";

export function sendSuccess<T>(res: Response, data: T, status = 200) {
  const body: ItemResponse<T> = { data };

  return res.status(status).json(body);
}

export function sendPaginated<T>(
  res: Response,
  result: PaginatedResponse<T>,
) {
  return res.status(200).json(result);
}