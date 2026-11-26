import { HttpError } from '../http/error-handler.js';
import { queryList, readPagination } from '../http/list-query.js';
import type { Profesor } from '../models/profesor.js';

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
