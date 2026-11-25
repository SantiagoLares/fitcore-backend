import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from './error-handler.js';

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
