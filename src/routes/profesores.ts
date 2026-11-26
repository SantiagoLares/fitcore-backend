import { Router } from 'express';
import profesoresMock from '../mocks/profesores.json';
import { sendPaginated, sendSuccess } from '../http/response.js';
import { listarProfesores, obtenerProfesorPorId } from '../services/profesores.js';
import type { Profesor } from '../models/profesor.js';
import clasesMock from '../mocks/clases.json';

const profesores: Profesor[] = structuredClone(profesoresMock);

const profesoresRouter = Router();

profesoresRouter.get('/', (req, res) => {
  const result = listarProfesores(profesores, req.query);

  return sendPaginated(res, result);
});

profesoresRouter.get('/:id', (req, res) => {
  const result = obtenerProfesorPorId(profesores, clasesMock, req.params.id);

  return sendSuccess(res, result);
});

export default profesoresRouter;
