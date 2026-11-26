import { HttpError } from '../http/error-handler.js';
import { queryList, readPagination } from '../http/list-query.js';
import type { Alumno, AlumnoEstado } from '../models/alumno.js';

type Query = Record<string, unknown>;

const camposOrden = ['id', 'apellido', 'nombre', 'dni', 'fechaAlta'] as const;

type CampoOrden = (typeof camposOrden)[number];

const estados: readonly AlumnoEstado[] = ['activo', 'baja'];

function texto(query: Query, campo: string): string | undefined {
    const valor = query[campo];

    if (valor === undefined) return undefined;

    if (typeof valor !== 'string') {
        throw new HttpError(400, 'INVALID_QUERY', `${campo} debe ser un único texto`);
    }

    return valor.trim();
}

// Pasa a minúsculas y quita las tildes, para que "gomez" encuentre "Gómez".
function normalizar(valor: string): string {
    return valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function listarAlumnos(alumnos: readonly Alumno[], query: Query) {
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
    const nombre = normalizar(texto(query, 'nombre') ?? '');
    const dni = normalizar(texto(query, 'dni') ?? '');
    const email = normalizar(texto(query, 'email') ?? '');
    const estado = texto(query, 'estado');

    if (estado !== undefined && !estados.includes(estado as AlumnoEstado)) {
        throw new HttpError(400, 'INVALID_ESTADO', 'estado debe ser activo o baja');
    }

    const campo = sortBy as CampoOrden;
    const direccion = order === 'asc' ? 1 : -1;

    return queryList(alumnos, {
        ...pagination,
        filter: (alumno) => {
            const nombreCompleto = normalizar(`${alumno.nombre} ${alumno.apellido}`);
            const alumnoDni = normalizar(alumno.dni);
            const alumnoEmail = normalizar(alumno.email);

            return (
                // search busca en nombre, apellido, DNI y email a la vez.
                (search === '' ||
                    nombreCompleto.includes(search) ||
                    alumnoDni.includes(search) ||
                    alumnoEmail.includes(search)) &&
                nombreCompleto.includes(nombre) &&
                alumnoDni.includes(dni) &&
                alumnoEmail.includes(email) &&
                (estado === undefined || alumno.estado === estado)
            );
        },
        compare: (a, b) => {
            const primero = a[campo];
            const segundo = b[campo];

            const comparacion =
                typeof primero === 'number' && typeof segundo === 'number'
                    ? primero - segundo
                    : String(primero).localeCompare(String(segundo), 'es', {
                        sensitivity: 'base',
                    });

            return (comparacion || a.id - b.id) * direccion;
        },
    });
}