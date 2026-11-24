import { Router } from 'express';
import usuariosMock from '../mocks/usuarios.json';
import { sendSuccess } from '../http/response.js';
import {
  crearCredenciales,
  iniciarSesion,
  registrarUsuario,
  solicitarRecuperacion,
} from '../services/auth.js';
import type { Usuario } from '../models/usuario.js';

// Estado en memoria: los cambios se reinician al reiniciar el servidor.
const usuarios: Usuario[] = structuredClone(usuariosMock) as Usuario[];
const credenciales = crearCredenciales(usuarios);

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

export default authRouter;
