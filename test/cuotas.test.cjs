const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { listarCuotas, calcularEstado } = require('../dist/services/cuotas.js');

const cuotas = JSON.parse(fs.readFileSync('src/mocks/cuotas.json', 'utf8'));

// Fecha fija para que el estado calculado no cambie con el paso del tiempo.
const HOY = '2026-11-26';

test('devuelve registros, total y página actual con los valores por defecto', () => {
    const result = listarCuotas(cuotas, {}, HOY);

    assert.equal(result.data.length, 10);
    assert.deepEqual(result.meta, {
        page: 1,
        limit: 10,
        total: 139,
        totalPages: 14,
    });
});

test('pagina y ordena por ID descendente', () => {
    const result = listarCuotas(cuotas, { page: '2', limit: '5', sortBy: 'id', order: 'desc' }, HOY);

    assert.deepEqual(
        result.data.map((cuota) => cuota.id),
        [134, 133, 132, 131, 130],
    );
    assert.deepEqual(result.meta, { page: 2, limit: 5, total: 139, totalPages: 28 });
});

test('ordena por fecha de vencimiento ascendente por defecto', () => {
    const { data } = listarCuotas(cuotas, { limit: '100' }, HOY);

    for (let i = 1; i < data.length; i++) {
        assert.ok(data[i - 1].fechaVencimiento <= data[i].fechaVencimiento);
    }
});

test('ordena por monto descendente', () => {
    const { data } = listarCuotas(cuotas, { sortBy: 'monto', order: 'desc', limit: '100' }, HOY);

    assert.equal(data[0].monto, 30000);
    assert.equal(data.at(-1).monto, 25000);
});

test('filtra por alumno', () => {
    const result = listarCuotas(cuotas, { alumnoId: '1' }, HOY);

    assert.equal(result.meta.total, 5);
    assert.ok(result.data.every((cuota) => cuota.alumno.id === 1));
});

test('filtra por período', () => {
    const result = listarCuotas(cuotas, { periodo: '2026-11', limit: '100' }, HOY);

    assert.equal(result.meta.total, 27);
    assert.ok(result.data.every((cuota) => cuota.periodo === '2026-11'));
});

test('filtra por estado calculado', () => {
    for (const [estado, total] of [
        ['pagada', 92],
        ['vencida', 24],
        ['pendiente', 23],
    ]) {
        const result = listarCuotas(cuotas, { estado, limit: '100' }, HOY);

        assert.equal(result.meta.total, total);
        assert.ok(result.data.every((cuota) => cuota.estado === estado));
    }
});

test('calcula el estado según el pago y la fecha de vencimiento', () => {
    const base = { fechaVencimiento: '2026-11-10' };

    assert.equal(calcularEstado({ ...base, pago: { id: 1 } }, HOY), 'pagada');
    assert.equal(calcularEstado({ ...base, pago: null }, HOY), 'vencida');
    assert.equal(calcularEstado({ ...base, pago: null }, '2026-11-10'), 'pendiente');
    assert.equal(calcularEstado({ ...base, pago: null }, '2026-11-01'), 'pendiente');
});

test('combina filtros: filtra primero y pagina después', () => {
    const result = listarCuotas(
        cuotas,
        { estado: 'vencida', periodo: '2026-10', limit: '2', page: '2', sortBy: 'id' },
        HOY,
    );

    assert.equal(result.meta.page, 2);
    assert.ok(result.meta.total > 2);
    assert.ok(
        result.data.every((cuota) => cuota.estado === 'vencida' && cuota.periodo === '2026-10'),
    );
});

test('devuelve una lista vacía cuando no hay coincidencias', () => {
    const result = listarCuotas(cuotas, { alumnoId: '9999' }, HOY);

    assert.deepEqual(result.data, []);
    assert.equal(result.meta.total, 0);
});

test('devuelve data vacía si la página pasa del total, con el total real', () => {
    const result = listarCuotas(cuotas, { page: '99' }, HOY);

    assert.deepEqual(result.data, []);
    assert.equal(result.meta.total, 139);
});

test('rechaza parámetros inválidos con HTTP 400', () => {
    for (const query of [
        { page: 'abc' },
        { limit: '500' },
        { sortBy: 'password' },
        { order: 'otro' },
        { alumnoId: 'abc' },
        { alumnoId: '0' },
        { estado: 'cualquiera' },
        { periodo: '2026-13' },
        { periodo: 'noviembre' },
        { estado: ['pagada', 'vencida'] },
    ]) {
        assert.throws(() => listarCuotas(cuotas, query, HOY), { status: 400 });
    }
});