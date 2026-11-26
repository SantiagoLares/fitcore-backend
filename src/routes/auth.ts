import { Router } from 'express';
import alumnosMock from '../mocks/alumnos.json';
import profesoresMock from '../mocks/profesores.json';
import { sendSuccess } from '../http/response.js';
import { requerirSesion } from '../http/auth.js';
import { usuarios, credenciales } from '../data/usuarios.js';
import {
  iniciarSesion,
  modificarPerfil,
  obtenerPerfil,
  registrarUsuario,
  solicitarRecuperacion,
} from '../services/auth.js';
import type { PerfilesAsociados } from '../services/auth.js';

const perfiles: PerfilesAsociados = { alumnos: alumnosMock, profesores: profesoresMock };

const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const sesion = iniciarSesion(usuarios, credenciales, req.body);

  return sendSuccess(res, sesion);
});

authRouter.post('/register', (req, res) => {
  const sesion = registrarUsuario(usuarios, credenciales, req.body);

  return sendSuccess(res, sesion, 201);
});

authRouter.post('/forgot-password', (req, res) => {
  const resultado = solicitarRecuperacion(req.body);

  return sendSuccess(res, resultado);
});

authRouter.get('/me', requerirSesion, (_req, res) => {
  const usuario = obtenerPerfil(usuarios, perfiles, res.locals.usuarioId);

  return sendSuccess(res, usuario);
});

authRouter.put('/me', requerirSesion, (req, res) => {
  const usuario = modificarPerfil(usuarios, credenciales, perfiles, res.locals.usuarioId, req.body);

  return sendSuccess(res, usuario);
});

export default authRouter;
