const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { obtenerCuotaPorId } = require('../dist/services/cuotas.js');

const cuotas = JSON.parse(fs.readFileSync('src/mocks/cuotas.json', 'utf8'));

// Fecha fija para que el estado calculado no cambie con el paso del tiempo.
const HOY = '2026-11-26';

test('devuelve la cuota con todos sus atributos, incluido el estado calculado', () => {
    const result = obtenerCuotaPorId(cuotas, '1', HOY);

    assert.deepEqual(result, {
        id: 1,
        alumno: { id: 1, nombre: 'Lucía', apellido: 'Gómez' },
        periodo: '2026-08',
        monto: 25000,
        fechaVencimiento: '2026-08-10',
        estado: 'vencida',
        pago: null,
    });
});

test('devuelve estado pagada y el pago cuando la cuota tiene pago', () => {
    const result = obtenerCuotaPorId(cuotas, '2', HOY);

    assert.equal(result.estado, 'pagada');
    assert.deepEqual(result.pago, { id: 1, fechaPago: '2026-08-03', medioPago: 'debito' });
});

test('no modifica el registro guardado al agregar el estado', () => {
    obtenerCuotaPorId(cuotas, '1', HOY);

    assert.equal('estado' in cuotas[0], false);
});

test('devuelve 404 para un ID válido que no existe', () => {
    assert.throws(() => obtenerCuotaPorId(cuotas, '999999', HOY), {
        status: 404,
        code: 'CUOTA_NOT_FOUND',
    });
});

test('devuelve 400 para IDs inválidos', () => {
    for (const id of ['abc', '0', '-1', '1.5', '1abc', '9007199254740992']) {
        assert.throws(() => obtenerCuotaPorId(cuotas, id, HOY), {
            status: 400,
            code: 'INVALID_ID',
        });
    }
});