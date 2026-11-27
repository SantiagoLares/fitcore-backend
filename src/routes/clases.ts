import { Router } from 'express';
import { sendPaginated, sendSuccess } from '../http/response.js';
import { listarClases, obtenerClasePorId } from '../services/clases.js';
import { crearClase, modificarClase, eliminarClase } from '../services/clases-write.js';
import type { ClaseProfesor } from '../models/clase.js';
import { clases, horarios } from '../data/clases.js';

// Fuente temporal de profesores hasta integrar su repositorio.
const profesores: ClaseProfesor[] = [
  ...new Map(clases.map((clase) => [clase.profesor.id, { ...clase.profesor }])).values(),
];

const clasesRouter = Router();

clasesRouter.get('/', (req, res) => {
  const result = listarClases(clases, horarios, req.query);

  return sendPaginated(res, result);
});

clasesRouter.get('/:id', (req, res) => {
  const clase = obtenerClasePorId(clases, horarios, req.params.id);

  return sendSuccess(res, clase);
});

clasesRouter.post('/', (req, res) => {
  const clase = crearClase(clases, horarios, profesores, req.body);

  res.location(`/api/v1/clases/${clase.id}`);

  return sendSuccess(res, clase, 201);
});

clasesRouter.put('/:id', (req, res) => {
  const clase = modificarClase(clases, profesores, req.params.id, req.body);

  return sendSuccess(res, clase);
});

clasesRouter.delete('/:id', (req, res) => {
  eliminarClase(clases, horarios, req.params.id);

  return res.status(204).send();
});

export default clasesRouter;
