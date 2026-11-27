import { HttpError } from '../http/error-handler.js';
import type { Clase } from '../models/clase.js';
import type { Horario, DiaSemana } from '../models/horario.js';
import { obtenerHorarioPorId } from './horarios.js';

const dias: DiaSemana[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

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

function enteroPositivo(valor: unknown, campo: string): number {
  if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor < 1) {
    throw new HttpError(400, 'INVALID_BODY', `${campo} debe ser un entero positivo`);
  }

  return valor;
}

function validarHorario(
  entrada: Record<string, unknown>,
): Pick<Horario, 'diaSemana' | 'horaInicio' | 'horaFin'> {
  const diaSemana = textoObligatorio(entrada.diaSemana, 'diaSemana');

  const horaInicio = textoObligatorio(entrada.horaInicio, 'horaInicio');

  const horaFin = textoObligatorio(entrada.horaFin, 'horaFin');

  const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (!dias.includes(diaSemana as DiaSemana)) {
    throw new HttpError(400, 'INVALID_DAY', 'Día de semana inválido');
  }

  if (!formatoHora.test(horaInicio) || !formatoHora.test(horaFin)) {
    throw new HttpError(400, 'INVALID_TIME', 'Las horas deben tener formato HH:MM válido');
  }

  if (horaFin <= horaInicio) {
    throw new HttpError(400, 'INVALID_TIME', 'horaFin debe ser posterior a horaInicio');
  }

  return {
    diaSemana: diaSemana as DiaSemana,
    horaInicio,
    horaFin,
  };
}

function siguienteId(horarios: readonly Horario[]): number {
  const id = horarios.reduce((maximo, horario) => Math.max(maximo, horario.id), 0) + 1;

  if (!Number.isSafeInteger(id)) {
    throw new Error('No se puede generar un ID seguro');
  }

  return id;
}

export function crearHorario(
  horarios: Horario[],
  clases: readonly Clase[],
  body: unknown,
): Horario {
  const entrada = objeto(body);

  const claseId = enteroPositivo(entrada.claseId, 'claseId');

  if (!clases.some((clase) => clase.id === claseId)) {
    throw new HttpError(400, 'INVALID_CLASS', 'La clase indicada no existe');
  }

  const datos = validarHorario(entrada);

  const nuevoHorario: Horario = {
    id: siguienteId(horarios),
    claseId,
    ...datos,
  };

  horarios.push(nuevoHorario);

  return { ...nuevoHorario };
}

export function modificarHorario(horarios: Horario[], id: unknown, body: unknown): Horario {
  const actual = obtenerHorarioPorId(horarios, id);
  const entrada = objeto(body);

  if (entrada.claseId !== undefined && entrada.claseId !== actual.claseId) {
    throw new HttpError(400, 'INVALID_CLASS', 'No se puede cambiar la clase del horario');
  }

  const datos = validarHorario(entrada);

  const actualizado: Horario = {
    ...actual,
    ...datos,
  };

  const indice = horarios.findIndex((horario) => horario.id === actual.id);

  horarios[indice] = actualizado;

  return { ...actualizado };
}

export function eliminarHorario(horarios: Horario[], id: unknown): void {
  const actual = obtenerHorarioPorId(horarios, id);

  const cantidadHorarios = horarios.filter((horario) => horario.claseId === actual.claseId).length;

  if (cantidadHorarios === 1) {
    throw new HttpError(409, 'LAST_SCHEDULE', 'La clase debe conservar al menos un horario');
  }

  const indice = horarios.findIndex((horario) => horario.id === actual.id);

  horarios.splice(indice, 1);
}
