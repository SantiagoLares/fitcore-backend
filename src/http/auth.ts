import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from './error-handler.js';
import type { PerfilUsuario, Usuario } from '../models/usuario.js';

// Lee "Authorization: Bearer <token>" y devuelve el id del usuario del token.
export function usuarioIdDelToken(encabezado: string | undefined): number {
  const [tipo, token] = (encabezado ?? '').split(' ');

  if (tipo !== 'Bearer' || !token) {
    throw new HttpError(401, 'UNAUTHORIZED', 'No hay sesión iniciada');
  }

  const secreto = process.env.JWT_SECRET;

  if (!secreto) {
    throw new Error('JWT_SECRET no está configurado');
  }

  let usuarioId: number;

  try {
    const payload = jwt.verify(token, secreto, { algorithms: ['HS256'] });
    usuarioId = Number(typeof payload === 'string' ? NaN : payload.sub);
  } catch {
    throw new HttpError(401, 'INVALID_TOKEN', 'La sesión es inválida o venció');
  }

  if (!Number.isSafeInteger(usuarioId)) {
    throw new HttpError(401, 'INVALID_TOKEN', 'La sesión es inválida o venció');
  }

  return usuarioId;
}

// Middleware: corta con 401 si no hay un token válido y, si lo hay,
// deja el id del usuario en res.locals.usuarioId para la ruta.
export const requerirSesion: RequestHandler = (req, res, next) => {
  res.locals.usuarioId = usuarioIdDelToken(req.headers.authorization);
  next();
};

// Comprueba que el usuario de la sesión tenga uno de los perfiles permitidos.
// Sin usuario activo → 401; con otro perfil → 403.
export function verificarPerfil(
  usuarios: readonly Usuario[],
  usuarioId: number,
  permitidos: readonly PerfilUsuario[],
): Usuario {
  const usuario = usuarios.find((u) => u.id === usuarioId);

  if (!usuario || !usuario.activo) {
    throw new HttpError(401, 'INVALID_TOKEN', 'La sesión es inválida o venció');
  }

  if (!permitidos.includes(usuario.perfil)) {
    throw new HttpError(403, 'FORBIDDEN', 'No tenés permiso para realizar esta acción');
  }

  return usuario;
}

// Middleware: se usa después de requerirSesion. Corta con 403 si el perfil no está permitido.
export function requerirPerfil(
  usuarios: readonly Usuario[],
  ...permitidos: PerfilUsuario[]
): RequestHandler {
  return (_req, res, next) => {
    verificarPerfil(usuarios, res.locals.usuarioId, permitidos);
    next();
  };
}
