import { HttpError } from '../http/error-handler.js';
import { queryList, readPagination } from '../http/list-query.js';
import type { PerfilUsuario, Usuario } from '../models/usuario.js';

type Query = Record<string, unknown>;

// Campos de orden permitidos por el contrato: nombre (por defecto), email e id.
const camposOrden = ['nombre', 'email', 'id'] as const;

type CampoOrden = (typeof camposOrden)[number];

const perfiles: PerfilUsuario[] = ['Alumno', 'Profesor', 'Administración'];

function texto(query: Query, campo: string): string | undefined {
  const valor = query[campo];

  if (valor === undefined) return undefined;

  if (typeof valor !== 'string') {
    throw new HttpError(400, 'INVALID_QUERY', `${campo} debe ser un único texto`);
  }

  return valor.trim();
}

// Sin mayúsculas ni tildes, para que "PEREZ" encuentre a "Pérez".
function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function leerPerfil(query: Query): PerfilUsuario | undefined {
  const valor = texto(query, 'perfil');

  if (valor === undefined) return undefined;

  const perfil = perfiles.find((p) => normalizar(p) === normalizar(valor));

  if (!perfil) {
    throw new HttpError(400, 'INVALID_FILTER', 'perfil debe ser Alumno, Profesor o Administración');
  }

  return perfil;
}

function leerActivo(query: Query): boolean | undefined {
  const valor = texto(query, 'activo');

  if (valor === undefined) return undefined;

  if (valor !== 'true' && valor !== 'false') {
    throw new HttpError(400, 'INVALID_FILTER', 'activo debe ser true o false');
  }

  return valor === 'true';
}

// GET /usuarios: filtra, ordena y pagina según el contrato de la API.
export function listarUsuarios(usuarios: readonly Usuario[], query: Query) {
  const pagination = readPagination({
    page: query.page,
    limit: query.limit,
  });

  const sortBy = texto(query, 'sortBy') ?? 'nombre';
  const order = texto(query, 'order') ?? 'asc';

  if (!camposOrden.includes(sortBy as CampoOrden)) {
    throw new HttpError(400, 'INVALID_SORT', 'Campo de orden no permitido');
  }

  if (order !== 'asc' && order !== 'desc') {
    throw new HttpError(400, 'INVALID_ORDER', 'order debe ser asc o desc');
  }

  const search = normalizar(texto(query, 'search') ?? '');
  const perfil = leerPerfil(query);
  const activo = leerActivo(query);

  const campo = sortBy as CampoOrden;
  const direccion = order === 'asc' ? 1 : -1;

  const resultado = queryList(usuarios, {
    ...pagination,
    filter: (usuario) =>
      (normalizar(usuario.nombre).includes(search) || normalizar(usuario.email).includes(search)) &&
      (perfil === undefined || usuario.perfil === perfil) &&
      (activo === undefined || usuario.activo === activo),
    compare: (a, b) => {
      const comparacion =
        campo === 'id'
          ? a.id - b.id
          : normalizar(a[campo]).localeCompare(normalizar(b[campo]), 'es');

      return (comparacion || a.id - b.id) * direccion;
    },
  });

  // Copias, para que nadie modifique el estado en memoria desde la respuesta.
  return { ...resultado, data: resultado.data.map((usuario) => ({ ...usuario })) };
}
