import { Router } from "express";
import clasesMock from "../mocks/clases.json";
import horariosMock from "../mocks/horarios.json";
import { sendPaginated, sendSuccess } from "../http/response.js";
import {
  listarClases,
  obtenerClasePorId,
} from "../services/clases.js";
import { crearClase } from "../services/clases-write.js";
import type { Clase, ClaseProfesor } from "../models/clase.js";
import type { Horario } from "../models/horario.js";

// Estado en memoria: los cambios se reinician al reiniciar el servidor.
const clases: Clase[] = structuredClone(clasesMock);
const horarios: Horario[] = structuredClone(horariosMock) as Horario[];

// Fuente temporal de profesores hasta integrar su repositorio.
const profesores: ClaseProfesor[] = [
  ...new Map(
    clases.map((clase) => [
      clase.profesor.id,
      { ...clase.profesor },
    ]),
  ).values(),
];

const clasesRouter = Router();

clasesRouter.get("/", (req, res) => {
  const result = listarClases(clases, horarios, req.query);

  return sendPaginated(res, result);
});

clasesRouter.get("/:id", (req, res) => {
  const clase = obtenerClasePorId(clases, horarios, req.params.id);

  return sendSuccess(res, clase);
});

clasesRouter.post("/", (req, res) => {
  const clase = crearClase(clases, horarios, profesores, req.body);

  res.location(`/api/v1/clases/${clase.id}`);

  return sendSuccess(res, clase, 201);
});

export default clasesRouter;