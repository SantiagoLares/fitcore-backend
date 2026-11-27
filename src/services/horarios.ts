import { HttpError } from '../http/error-handler.js';
import { queryList, readPagination } from '../http/list-query.js';
import type { Horario, DiaSemana } from '../models/horario.js';
import type { Clase } from '../models/clase.js';

type Query = Record<string, unknown>;

const camposOrden = ['id', 'diaSemana', 'horaInicio'] as const;

type CampoOrden = (typeof camposOrden)[number];

const dias: DiaSemana[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

function texto(query: Query, campo: string): string | undefined {
  const valor = query[campo];

  if (valor === undefined) return undefined;

  if (typeof valor !== 'string') {
    throw new HttpError(400, 'INVALID_QUERY', `${campo} debe ser un único texto`);
  }

  return valor.trim();
}

function enteroPositivo(query: Query, campo: string): number | undefined {
  const valor = texto(query, campo);

  if (valor === undefined) return undefined;

  const numero = Number(valor);

  if (!/^[1-9]\d*$/.test(valor) || !Number.isSafeInteger(numero)) {
    throw new HttpError(400, 'INVALID_FILTER', `${campo} debe ser un entero positivo`);
  }

  return numero;
}

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function listarHorarios(
  horarios: readonly Horario[],
  clases: readonly Clase[],
  query: Query,
) {
  const pagination = readPagination({
    page: query.page,
    limit: query.limit,
  });

  const sortBy = texto(query, 'sortBy') ?? 'diaSemana';
  const order = texto(query, 'order') ?? 'asc';

  if (!camposOrden.includes(sortBy as CampoOrden)) {
    throw new HttpError(400, 'INVALID_SORT', 'Campo de orden no permitido');
  }

  if (order !== 'asc' && order !== 'desc') {
    throw new HttpError(400, 'INVALID_ORDER', 'order debe ser asc o desc');
  }

  const claseId = enteroPositivo(query, 'claseId');
  const profesorId = enteroPositivo(query, 'profesorId');

  const diaTexto = texto(query, 'diaSemana');
  const dia = diaTexto === undefined ? undefined : normalizar(diaTexto);

  if (dia !== undefined && !dias.includes(dia as DiaSemana)) {
    throw new HttpError(400, 'INVALID_DAY', 'Día de semana inválido');
  }

  const clasesDelProfesor = new Set(
    clases.filter((clase) => clase.profesor.id === profesorId).map((clase) => clase.id),
  );

  const direccion = order === 'asc' ? 1 : -1;

  return queryList(horarios, {
    ...pagination,

    filter: (horario) => {
      return (
        (claseId === undefined || horario.claseId === claseId) &&
        (dia === undefined || horario.diaSemana === dia) &&
        (profesorId === undefined || clasesDelProfesor.has(horario.claseId))
      );
    },

    compare: (a, b) => {
      let comparacion: number;

      if (sortBy === 'diaSemana') {
        comparacion = dias.indexOf(a.diaSemana) - dias.indexOf(b.diaSemana);
      } else if (sortBy === 'horaInicio') {
        comparacion = a.horaInicio.localeCompare(b.horaInicio);
      } else {
        comparacion = a.id - b.id;
      }

      return (comparacion || a.id - b.id) * direccion;
    },
  });
}
