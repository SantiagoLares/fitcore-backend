const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { obtenerAlumnoPorId } = require('../dist/services/alumnos.js');

const alumnos = JSON.parse(fs.readFileSync('src/mocks/alumnos.json', 'utf8'));

test('devuelve el alumno con todos sus atributos', () => {
    const result = obtenerAlumnoPorId(alumnos, '1');

    assert.deepEqual(result, {
        id: 1,
        usuarioId: 11,
        dni: '43396013',
        nombre: 'Lucía',
        apellido: 'Gómez',
        email: 'lucia.gomez88@gmail.com',
        telefono: '2916501511',
        fechaAlta: '2024-03-04',
        estado: 'activo',
    });
});

test('devuelve también a un alumno dado de baja', () => {
    const result = obtenerAlumnoPorId(alumnos, '3');

    assert.equal(result.id, 3);
    assert.equal(result.estado, 'baja');
});

test('devuelve 404 para un ID válido que no existe', () => {
    assert.throws(() => obtenerAlumnoPorId(alumnos, '999999'), {
        status: 404,
        code: 'ALUMNO_NOT_FOUND',
    });
});

test('devuelve 400 para IDs inválidos', () => {
    for (const id of ['abc', '0', '-1', '1.5', '1abc', '9007199254740992']) {
        assert.throws(() => obtenerAlumnoPorId(alumnos, id), {
            status: 400,
            code: 'INVALID_ID',
        });
    }
});