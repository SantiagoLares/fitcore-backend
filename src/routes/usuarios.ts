import { Router } from 'express';
import { sendPaginated } from '../http/response.js';
import { requerirPerfil, requerirSesion } from '../http/auth.js';
import { usuarios } from '../data/usuarios.js';
import { listarUsuarios } from '../services/usuarios.js';

const usuariosRouter = Router();

// Según el contrato, todas las rutas de Usuarios son solo para Administración.
usuariosRouter.use(requerirSesion, requerirPerfil(usuarios, 'Administración'));

usuariosRouter.get('/', (req, res) => {
  const result = listarUsuarios(usuarios, req.query);

  return sendPaginated(res, result);
});

export default usuariosRouter;
