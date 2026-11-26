import { Router } from 'express';
import profesoresMock from '../mocks/profesores.json';
import { sendPaginated } from '../http/response.js';
import { listarProfesores } from '../services/profesores.js';
import type { Profesor } from '../models/profesor.js';

const profesores: Profesor[] = structuredClone(profesoresMock);

const profesoresRouter = Router();

profesoresRouter.get('/', (req, res) => {
  const result = listarProfesores(profesores, req.query);

  return sendPaginated(res, result);
});

export default profesoresRouter;
