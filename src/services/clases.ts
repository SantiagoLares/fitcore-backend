import { HttpError } from "../http/error-handler.js";
import { queryList, readPagination } from "../http/list-query.js";
import type { Clase, ClaseDetalle } from "../models/clase.js";
import type { Horario } from "../models/horario.js";

type Query = Record<string, unknown>;

const camposOrden = [
  "id",
  "nombre",
  "tipo",
  "cupoMaximo",
  "cuposDisponibles",
] as const;

type CampoOrden = (typeof camposOrden)[number];

const dias = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

function texto(query: Query, campo: string): string | undefined {
  const valor = query[campo];

  if (valor === undefined) return undefined;

  if (typeof valor !== "string") {
    throw new HttpError(
      400,
      "INVALID_QUERY",
      `${campo} debe ser un único texto`,
    );
  }

  return valor.trim();
}

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function listarClases(
  clases: readonly Clase[],
  horarios: readonly Horario[],
  query: Query,
) {
  const pagination = readPagination({
    page: query.page,
    limit: query.limit,
  });

  const sortBy = texto(query, "sortBy") ?? "nombre";
  const order = texto(query, "order") ?? "asc";

  if (!camposOrden.includes(sortBy as CampoOrden)) {
    throw new HttpError(
      400,
      "INVALID_SORT",
      "Campo de orden no permitido",
    );
  }

  if (order !== "asc" && order !== "desc") {
    throw new HttpError(
      400,
      "INVALID_ORDER",
      "order debe ser asc o desc",
    );
  }

  const search = normalizar(texto(query, "search") ?? "");
  const nombre = normalizar(texto(query, "nombre") ?? "");
  const tipo = texto(query, "tipo");
  const profesorTexto = texto(query, "profesorId");
  const diaTexto = texto(query, "diaSemana");
  const conCupo = texto(query, "conCupo");

  let profesorId: number | undefined;

  if (profesorTexto !== undefined) {
    profesorId = Number(profesorTexto);

    if (
      !/^[1-9]\d*$/.test(profesorTexto) ||
      !Number.isSafeInteger(profesorId)
    ) {
      throw new HttpError(
        400,
        "INVALID_PROFESOR",
        "profesorId debe ser un entero positivo",
      );
    }
  }

  const dia =
    diaTexto === undefined ? undefined : normalizar(diaTexto);

  if (dia !== undefined && !dias.includes(dia)) {
    throw new HttpError(
      400,
      "INVALID_DAY",
      "Día de semana inválido",
    );
  }

  if (
    conCupo !== undefined &&
    conCupo !== "true" &&
    conCupo !== "false"
  ) {
    throw new HttpError(
      400,
      "INVALID_FILTER",
      "conCupo debe ser true o false",
    );
  }

  const clasesDelDia = new Set(
    horarios
      .filter((horario) => horario.diaSemana === dia)
      .map((horario) => horario.claseId),
  );

  const campo = sortBy as CampoOrden;
  const direccion = order === "asc" ? 1 : -1;

  return queryList(clases, {
    ...pagination,

    filter: (clase) => {
      const nombreNormalizado = normalizar(clase.nombre);

      // Sin parámetro: todas. true: con cupo. false: sin cupo.
      const coincideCupo =
        conCupo === undefined ||
        (conCupo === "true"
          ? clase.cuposDisponibles > 0
          : clase.cuposDisponibles <= 0);

      return (
        nombreNormalizado.includes(search) &&
        nombreNormalizado.includes(nombre) &&
        (tipo === undefined ||
          normalizar(clase.tipo) === normalizar(tipo)) &&
        (profesorId === undefined ||
          clase.profesor.id === profesorId) &&
        (dia === undefined || clasesDelDia.has(clase.id)) &&
        coincideCupo
      );
    },

    compare: (a, b) => {
      const primero = a[campo];
      const segundo = b[campo];

      const comparacion =
        typeof primero === "number" && typeof segundo === "number"
          ? primero - segundo
          : String(primero).localeCompare(String(segundo), "es", {
              sensitivity: "base",
            });

      return (comparacion || a.id - b.id) * direccion;
    },
  });
}

export function obtenerClasePorId(
  clases: readonly Clase[],
  horarios: readonly Horario[],
  id: unknown,
): ClaseDetalle {
  if (
    typeof id !== "string" ||
    !/^[1-9]\d*$/.test(id) ||
    !Number.isSafeInteger(Number(id))
  ) {
    throw new HttpError(
      400,
      "INVALID_ID",
      "El ID debe ser un entero positivo",
    );
  }

  const clase = clases.find((item) => item.id === Number(id));

  if (!clase) {
    throw new HttpError(
      404,
      "CLASS_NOT_FOUND",
      "Clase no encontrada",
    );
  }

  return {
    ...clase,
    horarios: horarios.filter(
      (horario) => horario.claseId === clase.id,
    ),
  };
}