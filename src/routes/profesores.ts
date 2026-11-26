import { Router } from 'express';
import profesoresMock from '../mocks/profesores.json';
import { sendPaginated, sendSuccess } from '../http/response.js';
import { listarProfesores, obtenerProfesorPorId, crearProfesor } from '../services/profesores.js';
import type { Profesor } from '../models/profesor.js';
import clasesMock from '../mocks/clases.json';
import usuariosMock from '../mocks/usuarios.json';
import type { Usuario } from '../models/usuario.js';

const profesores: Profesor[] = structuredClone(profesoresMock);
const usuarios: Usuario[] = structuredClone(usuariosMock) as Usuario[];

const profesoresRouter = Router();

profesoresRouter.get('/', (req, res) => {
  const result = listarProfesores(profesores, req.query);

  return sendPaginated(res, result);
});

profesoresRouter.get('/:id', (req, res) => {
  const result = obtenerProfesorPorId(profesores, clasesMock, req.params.id);

  return sendSuccess(res, result);
});

profesoresRouter.post('/', (req, res) => {
  const profesor = crearProfesor(profesores, usuarios, req.body);

  res.location(`/api/v1/profesores/${profesor.id}`);

  return sendSuccess(res, profesor, 201);
});

export default profesoresRouter;
