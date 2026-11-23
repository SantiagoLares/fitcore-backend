import { Router } from "express";
import clases from "../mocks/clases.json";
import horarios from "../mocks/horarios.json";
import { sendPaginated } from "../http/response.js";
import { listarClases } from "../services/clases.js";
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

export default clasesRouter;