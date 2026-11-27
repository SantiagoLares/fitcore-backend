import { HttpError } from '../http/error-handler.js';
import { queryList, readPagination } from '../http/list-query.js';
import type { Alumno, AlumnoEstado } from '../models/alumno.js';
import type { Usuario } from '../models/usuario.js';

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

export function obtenerAlumnoPorId(alumnos: readonly Alumno[], id: unknown): Alumno {
    if (
        typeof id !== 'string' ||
        !/^[1-9]\d*$/.test(id) ||
        !Number.isSafeInteger(Number(id))
    ) {
        throw new HttpError(400, 'INVALID_ID', 'El ID debe ser un entero positivo');
    }

    const alumno = alumnos.find((item) => item.id === Number(id));

    if (!alumno) {
        throw new HttpError(404, 'ALUMNO_NOT_FOUND', 'Alumno no encontrado');
    }

    return { ...alumno };

}

// Fecha de hoy como AAAA-MM-DD, según la hora local del servidor.
function fechaDeHoy(): string {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');

    return `${ahora.getFullYear()}-${mes}-${dia}`;
}

function leerCuerpo(body: unknown): Record<string, unknown> {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new HttpError(400, 'INVALID_BODY', 'Datos del alumno inválidos');
    }

    return body as Record<string, unknown>;
}

function validarTexto(valor: unknown, campo: string): string {
    if (typeof valor !== 'string' || valor.trim() === '') {
        throw new HttpError(400, 'INVALID_FIELD', `${campo} es obligatorio y debe ser un texto válido`);
    }

    return valor.trim();
}

type DatosAlumno = Omit<Alumno, 'id' | 'fechaAlta' | 'estado'>;

function validarDatosAlumno(datos: Record<string, unknown>, usuarios: readonly Usuario[]): DatosAlumno {
    const usuarioId = datos.usuarioId;

    if (typeof usuarioId !== 'number' || !Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
        throw new HttpError(400, 'INVALID_USER_ID', 'usuarioId debe ser un entero positivo');
    }

    const dni = validarTexto(datos.dni, 'dni');
    const nombre = validarTexto(datos.nombre, 'nombre');
    const apellido = validarTexto(datos.apellido, 'apellido');
    const email = validarTexto(datos.email, 'email');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new HttpError(400, 'INVALID_EMAIL', 'El email no es válido');
    }

    if (datos.telefono !== undefined && typeof datos.telefono !== 'string') {
        throw new HttpError(400, 'INVALID_PHONE', 'El teléfono debe ser un texto');
    }

    const telefono = typeof datos.telefono === 'string' ? datos.telefono.trim() : '';

    const usuario = usuarios.find((item) => item.id === usuarioId);

    if (!usuario || usuario.perfil !== 'Alumno') {
        throw new HttpError(400, 'INVALID_USER', 'El usuario debe existir y tener perfil Alumno');
    }

    return { usuarioId, dni, nombre, apellido, email, telefono };
}

function validarDuplicadosAlumno(
    alumnos: readonly Alumno[],
    datos: DatosAlumno,
    alumnoId?: number,
): void {
    if (alumnos.some((alumno) => alumno.id !== alumnoId && alumno.dni === datos.dni)) {
        throw new HttpError(409, 'DUPLICATE_DNI', 'El DNI ya está registrado');
    }

    if (alumnos.some((alumno) => alumno.id !== alumnoId && alumno.usuarioId === datos.usuarioId)) {
        throw new HttpError(409, 'DUPLICATE_USER', 'El usuario ya tiene un alumno asociado');
    }
}

export function crearAlumno(
    alumnos: Alumno[],
    usuarios: readonly Usuario[],
    body: unknown,
    hoy: string = fechaDeHoy(),
): Alumno {
    const datos = validarDatosAlumno(leerCuerpo(body), usuarios);

    validarDuplicadosAlumno(alumnos, datos);

    const id = Math.max(0, ...alumnos.map((alumno) => alumno.id)) + 1;

    // id, fechaAlta y estado los pone el servidor: si vienen en el cuerpo, se ignoran.
    const alumno: Alumno = { id, ...datos, fechaAlta: hoy, estado: 'activo' };

    alumnos.push(alumno);

    return alumno;
}