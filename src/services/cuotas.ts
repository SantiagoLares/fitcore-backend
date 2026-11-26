import { HttpError } from '../http/error-handler.js';
import { queryList, readPagination } from '../http/list-query.js';
import type { Cuota, CuotaEstado, CuotaRegistro } from '../models/cuota.js';

type Query = Record<string, unknown>;

const camposOrden = ['id', 'fechaVencimiento', 'periodo', 'monto'] as const;

type CampoOrden = (typeof camposOrden)[number];

const estados: readonly CuotaEstado[] = ['pagada', 'pendiente', 'vencida'];

function texto(query: Query, campo: string): string | undefined {
    const valor = query[campo];

    if (valor === undefined) return undefined;

    if (typeof valor !== 'string') {
        throw new HttpError(400, 'INVALID_QUERY', `${campo} debe ser un único texto`);
    }

    return valor.trim();
}

// Fecha de hoy como AAAA-MM-DD, según la hora local del servidor.
export function fechaDeHoy(): string {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');

    return `${ahora.getFullYear()}-${mes}-${dia}`;
}

// El estado no se guarda: pagada si tiene pago; si no, vencida o pendiente según la fecha.
export function calcularEstado(cuota: CuotaRegistro, hoy: string): CuotaEstado {
    if (cuota.pago) return 'pagada';

    return hoy > cuota.fechaVencimiento ? 'vencida' : 'pendiente';
}

export function listarCuotas(
    cuotas: readonly CuotaRegistro[],
    query: Query,
    hoy: string = fechaDeHoy(),
) {
    const pagination = readPagination({
        page: query.page,
        limit: query.limit,
    });

    const sortBy = texto(query, 'sortBy') ?? 'fechaVencimiento';
    const order = texto(query, 'order') ?? 'asc';

    if (!camposOrden.includes(sortBy as CampoOrden)) {
        throw new HttpError(400, 'INVALID_SORT', 'Campo de orden no permitido');
    }

    if (order !== 'asc' && order !== 'desc') {
        throw new HttpError(400, 'INVALID_ORDER', 'order debe ser asc o desc');
    }

    const alumnoTexto = texto(query, 'alumnoId');
    const estado = texto(query, 'estado');
    const periodo = texto(query, 'periodo');

    let alumnoId: number | undefined;

    if (alumnoTexto !== undefined) {
        alumnoId = Number(alumnoTexto);

        if (!/^[1-9]\d*$/.test(alumnoTexto) || !Number.isSafeInteger(alumnoId)) {
            throw new HttpError(400, 'INVALID_ALUMNO', 'alumnoId debe ser un entero positivo');
        }
    }

    if (estado !== undefined && !estados.includes(estado as CuotaEstado)) {
        throw new HttpError(400, 'INVALID_ESTADO', 'estado debe ser pagada, pendiente o vencida');
    }

    if (periodo !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
        throw new HttpError(400, 'INVALID_PERIODO', 'periodo debe tener el formato AAAA-MM');
    }

    const campo = sortBy as CampoOrden;
    const direccion = order === 'asc' ? 1 : -1;

    const conEstado: Cuota[] = cuotas.map((cuota) => ({
        ...cuota,
        estado: calcularEstado(cuota, hoy),
    }));

    return queryList(conEstado, {
        ...pagination,
        filter: (cuota) =>
            (alumnoId === undefined || cuota.alumno.id === alumnoId) &&
            (periodo === undefined || cuota.periodo === periodo) &&
            (estado === undefined || cuota.estado === estado),
        compare: (a, b) => {
            const primero = a[campo];
            const segundo = b[campo];

            let comparacion = 0;

            if (primero < segundo) comparacion = -1;
            else if (primero > segundo) comparacion = 1;

            return (comparacion || a.id - b.id) * direccion;
        },
    });
}