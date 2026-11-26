import { HttpError } from '../http/error-handler.js';
import { queryList, readPagination } from '../http/list-query.js';
import type { Profesor, ProfesorDetalle } from '../models/profesor.js';
import type { Clase } from '../models/clase.js';
import type { Usuario } from '../models/usuario.js';

type Query = Record<string, unknown>;

const camposOrden = ['apellido', 'nombre', 'dni', 'especialidad'] as const;

type CampoOrden = (typeof camposOrden)[number];

function texto(query: Query, campo: string): string | undefined {
  const valor = query[campo];

  if (valor === undefined) return undefined;

  if (typeof valor !== 'string') {
    throw new HttpError(400, 'INVALID_QUERY', `${campo} debe ser un único texto`);
  }

  return valor.trim();
}

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function listarProfesores(profesores: readonly Profesor[], query: Query) {
  const pagination = readPagination({
    page: query.page,
    limit: query.limit,
  });

  const sortBy = texto(query, 'sortBy') ?? 'apellido';
  const order = texto(query, 'order') ?? 'asc';

  if (!camposOrden.includes(sortBy as CampoOrden)) {
    throw new HttpError(400, 'INVALID_SORT', 'Campo de orden no permitido');
  }

  if (order !== 'asc' && order !== 'desc') {
    throw new HttpError(400, 'INVALID_ORDER', 'order debe ser asc o desc');
  }

  const search = normalizar(texto(query, 'search') ?? '');
  const especialidadTexto = texto(query, 'especialidad');

  const especialidad = especialidadTexto === undefined ? undefined : normalizar(especialidadTexto);

  const campo = sortBy as CampoOrden;
  const direccion = order === 'asc' ? 1 : -1;

  return queryList(profesores, {
    ...pagination,
    filter: (profesor) => {
      const coincideBusqueda =
        normalizar(profesor.apellido).includes(search) ||
        normalizar(profesor.nombre).includes(search) ||
        normalizar(profesor.dni).includes(search);

      const coincideEspecialidad =
        especialidad === undefined || normalizar(profesor.especialidad) === especialidad;

      return coincideBusqueda && coincideEspecialidad;
    },
    compare: (a, b) => {
      const comparacion = normalizar(a[campo]).localeCompare(normalizar(b[campo]), 'es');

      return (comparacion || a.id - b.id) * direccion;
    },
  });
}

export function obtenerProfesorPorId(
  profesores: readonly Profesor[],
  clases: readonly Clase[],
  id: unknown,
): ProfesorDetalle {
  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    throw new HttpError(400, 'INVALID_ID', 'El ID debe ser un entero positivo');
  }

  const profesor = profesores.find((item) => item.id === Number(id));

  if (!profesor) {
    throw new HttpError(404, 'PROFESSOR_NOT_FOUND', 'Profesor no encontrado');
  }

  return {
    ...profesor,
    clases: clases
      .filter((clase) => clase.profesor.id === profesor.id)
      .map((clase) => ({
        id: clase.id,
        nombre: clase.nombre,
      })),
  };
}

function validarTexto(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new HttpError(400, 'INVALID_FIELD', `${campo} es obligatorio y debe ser un texto válido`);
  }

  return valor.trim();
}

function validarDatosProfesor(body: unknown, usuarios: readonly Usuario[]): Omit<Profesor, 'id'> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_BODY', 'Datos del profesor inválidos');
  }

  const datos = body as Record<string, unknown>;

  const usuarioId = datos.usuarioId;

  if (typeof usuarioId !== 'number' || !Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
    throw new HttpError(400, 'INVALID_USER_ID', 'usuarioId debe ser un entero positivo');
  }

  const dni = validarTexto(datos.dni, 'dni');
  const nombre = validarTexto(datos.nombre, 'nombre');
  const apellido = validarTexto(datos.apellido, 'apellido');
  const email = validarTexto(datos.email, 'email');
  const especialidad = validarTexto(datos.especialidad, 'especialidad');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'INVALID_EMAIL', 'El email no es válido');
  }

  if (datos.telefono !== undefined && typeof datos.telefono !== 'string') {
    throw new HttpError(400, 'INVALID_PHONE', 'El teléfono debe ser un texto');
  }

  const telefono = typeof datos.telefono === 'string' ? datos.telefono.trim() : '';

  const usuario = usuarios.find((item) => item.id === usuarioId);

  if (!usuario || usuario.perfil !== 'Profesor') {
    throw new HttpError(400, 'INVALID_USER', 'El usuario debe existir y tener perfil Profesor');
  }

  return {
    usuarioId,
    dni,
    nombre,
    apellido,
    email,
    telefono,
    especialidad,
  };
}

export function crearProfesor(
  profesores: Profesor[],
  usuarios: readonly Usuario[],
  body: unknown,
): Profesor {
  const datos = validarDatosProfesor(body, usuarios);

  if (profesores.some((profesor) => profesor.dni === datos.dni)) {
    throw new HttpError(409, 'DUPLICATE_DNI', 'El DNI ya está registrado');
  }

  if (profesores.some((profesor) => profesor.usuarioId === datos.usuarioId)) {
    throw new HttpError(409, 'DUPLICATE_USER', 'El usuario ya tiene un profesor asociado');
  }

  const id = Math.max(0, ...profesores.map((profesor) => profesor.id)) + 1;

  const profesor: Profesor = {
    id,
    ...datos,
  };

  profesores.push(profesor);

  return profesor;
}

export function modificarProfesor(
  profesores: Profesor[],
  usuarios: readonly Usuario[],
  id: unknown,
  body: unknown,
): Profesor {
  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    throw new HttpError(400, 'INVALID_ID', 'El ID debe ser un entero positivo');
  }

  const indice = profesores.findIndex((profesor) => profesor.id === Number(id));

  if (indice === -1) {
    throw new HttpError(404, 'PROFESSOR_NOT_FOUND', 'Profesor no encontrado');
  }

  const datos = validarDatosProfesor(body, usuarios);

  if (profesores.some((profesor) => profesor.id !== Number(id) && profesor.dni === datos.dni)) {
    throw new HttpError(409, 'DUPLICATE_DNI', 'El DNI ya está registrado');
  }

  if (
    profesores.some(
      (profesor) => profesor.id !== Number(id) && profesor.usuarioId === datos.usuarioId,
    )
  ) {
    throw new HttpError(409, 'DUPLICATE_USER', 'El usuario ya tiene un profesor asociado');
  }

  const profesorActualizado: Profesor = {
    id: Number(id),
    ...datos,
  };

  profesores[indice] = profesorActualizado;

  return profesorActualizado;
}

export function eliminarProfesor(
  profesores: Profesor[],
  clases: readonly Clase[],
  id: unknown,
): void {
  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    throw new HttpError(400, 'INVALID_ID', 'El ID debe ser un entero positivo');
  }

  const indice = profesores.findIndex((profesor) => profesor.id === Number(id));

  if (indice === -1) {
    throw new HttpError(404, 'PROFESSOR_NOT_FOUND', 'Profesor no encontrado');
  }

  const tieneClases = clases.some((clase) => clase.profesor.id === Number(id));

  if (tieneClases) {
    throw new HttpError(
      409,
      'PROFESSOR_HAS_CLASSES',
      'El profesor tiene clases asignadas. Reasigná o eliminá esas clases primero',
    );
  }

  profesores.splice(indice, 1);
}
