import { Router } from "express";
import clases from "../mocks/clases.json";
import horarios from "../mocks/horarios.json";
import { sendPaginated, sendSuccess } from "../http/response.js";
import {
  listarClases,
  obtenerClasePorId,
} from "../services/clases.js";
import type { Horario } from "../models/horario.js";

const clasesRouter = Router();

clasesRouter.get("/", (req, res) => {
  const result = listarClases(
    clases,
    horarios as Horario[],
    req.query,
  );

  return sendPaginated(res, result);
});

clasesRouter.get("/:id", (req, res) => {
  const clase = obtenerClasePorId(
    clases,
    horarios as Horario[],
    req.params.id,
  );

  return sendSuccess(res, clase);
});

export default clasesRouter;