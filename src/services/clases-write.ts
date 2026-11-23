import { HttpError } from "../http/error-handler.js";
import type { Clase, ClaseProfesor, ClaseDetalle } from "../models/clase.js";
import type { Horario } from "../models/horario.js";

const dias = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

function objeto(valor: unknown): Record<string, unknown> {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new HttpError(400, "INVALID_BODY", "Se espera un objeto JSON");
  }

  return valor as Record<string, unknown>;
}

function textoObligatorio(valor: unknown, campo: string): string {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new HttpError(
      400,
      "INVALID_BODY",
      `${campo} es obligatorio y debe ser un texto`,
    );
  }

  return valor.trim();
}

function enteroPositivo(valor: unknown, campo: string): number {
  if (
    typeof valor !== "number" ||
    !Number.isSafeInteger(valor) ||
    valor < 1
  ) {
    throw new HttpError(
      400,
      "INVALID_BODY",
      `${campo} debe ser un entero positivo`,
    );
  }

  return valor;
}

function validarHorario(valor: unknown): Pick<
  Horario,
  "diaSemana" | "horaInicio" | "horaFin"
> {
  const entrada = objeto(valor);
  const diaSemana = textoObligatorio(entrada.diaSemana, "diaSemana");
  const horaInicio = textoObligatorio(entrada.horaInicio, "horaInicio");
  const horaFin = textoObligatorio(entrada.horaFin, "horaFin");
  const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (!dias.includes(diaSemana)) {
    throw new HttpError(400, "INVALID_DAY", "Día de semana inválido");
  }

  if (!formatoHora.test(horaInicio) || !formatoHora.test(horaFin)) {
    throw new HttpError(
      400,
      "INVALID_TIME",
      "Las horas deben tener formato HH:MM válido",
    );
  }

  if (horaFin <= horaInicio) {
    throw new HttpError(
      400,
      "INVALID_TIME",
      "horaFin debe ser posterior a horaInicio",
    );
  }

  return {
    diaSemana: diaSemana as Horario["diaSemana"],
    horaInicio,
    horaFin,
  };
}

function siguienteId(items: readonly { id: number }[]): number {
  const id = items.reduce((maximo, item) => Math.max(maximo, item.id), 0) + 1;

  if (!Number.isSafeInteger(id)) {
    throw new Error("No se puede generar un ID seguro");
  }

  return id;
}

export function crearClase(
  clases: Clase[],
  horarios: Horario[],
  profesores: readonly ClaseProfesor[],
  body: unknown,
): ClaseDetalle {
  const entrada = objeto(body);
  const nombre = textoObligatorio(entrada.nombre, "nombre");
  const tipo = textoObligatorio(entrada.tipo, "tipo");
  const cupoMaximo = enteroPositivo(entrada.cupoMaximo, "cupoMaximo");
  const profesorId = enteroPositivo(entrada.profesorId, "profesorId");

  const profesor = profesores.find((item) => item.id === profesorId);

  if (!profesor) {
    throw new HttpError(
      400,
      "INVALID_PROFESOR",
      "El profesor indicado no existe",
    );
  }

  if (!Array.isArray(entrada.horarios) || entrada.horarios.length === 0) {
    throw new HttpError(
      400,
      "INVALID_SCHEDULES",
      "La clase debe tener al menos un horario",
    );
  }

  // Validamos todos los horarios antes de modificar los arreglos.
  const horariosValidados = entrada.horarios.map(validarHorario);
  const claseId = siguienteId(clases);
  const primerHorarioId = siguienteId(horarios);

  if (
    !Number.isSafeInteger(primerHorarioId + horariosValidados.length - 1)
  ) {
    throw new Error("No se pueden generar IDs seguros para los horarios");
  }

  const nuevaClase: Clase = {
    id: claseId,
    nombre,
    tipo,
    cupoMaximo,
    cuposOcupados: 0,
    cuposDisponibles: cupoMaximo,
    profesor: {
      id: profesor.id,
      nombre: profesor.nombre,
      apellido: profesor.apellido,
    },
  };

  const nuevosHorarios: Horario[] = horariosValidados.map(
    (horario, indice) => ({
      id: primerHorarioId + indice,
      claseId,
      ...horario,
    }),
  );

  clases.push(nuevaClase);
  horarios.push(...nuevosHorarios);

  return {
    ...nuevaClase,
    horarios: nuevosHorarios,
  };
}