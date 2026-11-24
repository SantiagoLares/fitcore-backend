import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { HttpError } from '../http/error-handler.js';
import type { Usuario } from '../models/usuario.js';

// Contraseña compartida por todos los usuarios del mock (solo para la demo).
export const PASSWORD_DEMO = 'secreto123';

const DURACION_TOKEN = '8h';
const LARGO_MINIMO_PASSWORD = 8;
const formatoEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const MENSAJE_CREDENCIALES = 'Email o contraseña incorrectos';
const MENSAJE_RECUPERACION =
  'Si el email está registrado, vas a recibir las instrucciones para recuperar la contraseña.';

// Contraseñas cifradas, guardadas aparte del usuario para no devolverlas nunca.
export type Credenciales = Map<number, string>;

export interface Sesion {
  token: string;
  usuario: Usuario;
}

function objeto(valor: unknown): Record<string, unknown> {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new HttpError(400, 'INVALID_BODY', 'Se espera un objeto JSON');
  }

  return valor as Record<string, unknown>;
}

function textoObligatorio(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new HttpError(400, 'INVALID_BODY', `${campo} es obligatorio y debe ser un texto`);
  }

  return valor.trim();
}

function emailValido(valor: unknown): string {
  const email = textoObligatorio(valor, 'email').toLowerCase();

  if (!formatoEmail.test(email)) {
    throw new HttpError(400, 'INVALID_EMAIL', 'email no tiene un formato válido');
  }

  return email;
}

function passwordObligatoria(valor: unknown): string {
  if (typeof valor !== 'string' || valor === '') {
    throw new HttpError(400, 'INVALID_BODY', 'password es obligatorio y debe ser un texto');
  }

  return valor;
}

export function cifrarPassword(password: string): string {
  const sal = randomBytes(16).toString('hex');
  const hash = scryptSync(password, sal, 64).toString('hex');

  return `${sal}:${hash}`;
}

function passwordCoincide(password: string, guardada: string): boolean {
  const [sal, hash] = guardada.split(':');
  const esperado = Buffer.from(hash, 'hex');
  const calculado = scryptSync(password, sal, esperado.length);

  return timingSafeEqual(calculado, esperado);
}

// Todos los usuarios del mock arrancan con PASSWORD_DEMO.
export function crearCredenciales(usuarios: Usuario[]): Credenciales {
  const hashDemo = cifrarPassword(PASSWORD_DEMO);

  return new Map(usuarios.map((usuario) => [usuario.id, hashDemo]));
}

function buscarPorEmail(usuarios: Usuario[], email: string): Usuario | undefined {
  return usuarios.find((usuario) => usuario.email.toLowerCase() === email);
}

function firmarToken(usuario: Usuario): string {
  const secreto = process.env.JWT_SECRET;

  if (!secreto) {
    throw new Error('JWT_SECRET no está configurado');
  }

  return jwt.sign({ perfil: usuario.perfil }, secreto, {
    subject: String(usuario.id),
    expiresIn: DURACION_TOKEN,
  });
}

function crearSesion(usuario: Usuario): Sesion {
  return { token: firmarToken(usuario), usuario: { ...usuario } };
}

export function iniciarSesion(
  usuarios: Usuario[],
  credenciales: Credenciales,
  body: unknown,
): Sesion {
  const entrada = objeto(body);
  const email = textoObligatorio(entrada.email, 'email').toLowerCase();
  const password = passwordObligatoria(entrada.password);

  const usuario = buscarPorEmail(usuarios, email);
  const guardada = usuario ? credenciales.get(usuario.id) : undefined;

  if (!usuario || !guardada || !passwordCoincide(password, guardada) || !usuario.activo) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', MENSAJE_CREDENCIALES);
  }

  return crearSesion(usuario);
}

export function registrarUsuario(
  usuarios: Usuario[],
  credenciales: Credenciales,
  body: unknown,
): Sesion {
  const entrada = objeto(body);
  const nombre = textoObligatorio(entrada.nombre, 'nombre');
  const email = emailValido(entrada.email);
  const password = passwordObligatoria(entrada.password);

  if (password.length < LARGO_MINIMO_PASSWORD) {
    throw new HttpError(
      400,
      'INVALID_PASSWORD',
      `password debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`,
    );
  }

  if (buscarPorEmail(usuarios, email)) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'Ya existe un usuario con ese email');
  }

  const usuario: Usuario = {
    id: Math.max(0, ...usuarios.map((u) => u.id)) + 1,
    nombre,
    email,
    perfil: 'Alumno',
    activo: true,
  };

  usuarios.push(usuario);
  credenciales.set(usuario.id, cifrarPassword(password));

  return crearSesion(usuario);
}

// En el prototipo no se envía ningún email: la respuesta es la misma exista o no.
export function solicitarRecuperacion(body: unknown): { mensaje: string } {
  const entrada = objeto(body);
  emailValido(entrada.email);

  return { mensaje: MENSAJE_RECUPERACION };
}
