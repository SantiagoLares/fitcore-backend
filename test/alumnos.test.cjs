const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { listarAlumnos } = require('../dist/services/alumnos.js');

const alumnos = JSON.parse(fs.readFileSync('src/mocks/alumnos.json', 'utf8'));

test('devuelve registros, total y página actual con los valores por defecto', () => {
    const result = listarAlumnos(alumnos, {});

    assert.equal(result.data.length, 10);
    assert.deepEqual(result.meta, { page: 1, limit: 10, total: 32, totalPages: 4 });
});

test('pagina y ordena por ID descendente', () => {
    const result = listarAlumnos(alumnos, { page: '2', limit: '5', sortBy: 'id', order: 'desc' });

    assert.deepEqual(
        result.data.map((alumno) => alumno.id),
        [27, 26, 25, 24, 23],
    );
    assert.deepEqual(result.meta, { page: 2, limit: 5, total: 32, totalPages: 7 });
});

test('ordena por apellido ascendente por defecto, sin importar las tildes', () => {
    const { data } = listarAlumnos(alumnos, { limit: '3' });

    assert.deepEqual(
        data.map((alumno) => alumno.apellido),
        ['Aguirre', 'Álvarez', 'Benítez'],
    );
});

test('ordena por fecha de alta descendente', () => {
    const { data } = listarAlumnos(alumnos, { sortBy: 'fechaAlta', order: 'desc', limit: '100' });

    for (let i = 1; i < data.length; i++) {
        assert.ok(data[i - 1].fechaAlta >= data[i].fechaAlta);
    }
});

test('filtra por nombre sin distinguir mayúsculas ni tildes', () => {
    const result = listarAlumnos(alumnos, { nombre: 'GOMEZ' });

    assert.equal(result.meta.total, 2);
    assert.ok(result.data.every((alumno) => alumno.apellido === 'Gómez'));
});

test('filtra por DNI', () => {
    const result = listarAlumnos(alumnos, { dni: '4339' });

    assert.equal(result.meta.total, 1);
    assert.equal(result.data[0].dni, '43396013');
});

test('filtra por email', () => {
    const result = listarAlumnos(alumnos, { email: 'gmail', limit: '100' });

    assert.equal(result.meta.total, 18);
    assert.ok(result.data.every((alumno) => alumno.email.includes('gmail')));
});

test('filtra por estado', () => {
    for (const [estado, total] of [
        ['activo', 27],
        ['baja', 5],
    ]) {
        const result = listarAlumnos(alumnos, { estado, limit: '100' });

        assert.equal(result.meta.total, total);
        assert.ok(result.data.every((alumno) => alumno.estado === estado));
    }
});

test('search busca en nombre, apellido, DNI y email a la vez', () => {
    const porNombre = listarAlumnos(alumnos, { search: 'LUCÍA', sortBy: 'id' });
    const porDni = listarAlumnos(alumnos, { search: '43396013' });
    const porEmail = listarAlumnos(alumnos, { search: 'jdiaz@' });

    assert.ok(porNombre.data.some((alumno) => alumno.nombre === 'Lucía'));
    assert.equal(porDni.meta.total, 1);
    assert.equal(porEmail.data[0].nombre, 'Joaquín');
});

test('combina filtros: filtra primero y pagina después', () => {
    const result = listarAlumnos(alumnos, {
        estado: 'activo',
        page: '3',
        limit: '10',
        sortBy: 'id',
    });

    assert.equal(result.data.length, 7);
    assert.deepEqual(result.meta, { page: 3, limit: 10, total: 27, totalPages: 3 });
    assert.ok(result.data.every((alumno) => alumno.estado === 'activo'));

    const baja = listarAlumnos(alumnos, { estado: 'baja', email: 'hotmail' });

    assert.equal(baja.meta.total, 3);
});

test('devuelve una lista vacía cuando no hay coincidencias', () => {
    const result = listarAlumnos(alumnos, { nombre: 'inexistente' });

    assert.deepEqual(result.data, []);
    assert.equal(result.meta.total, 0);
});

test('devuelve data vacía si la página pasa del total, con el total real', () => {
    const result = listarAlumnos(alumnos, { page: '99' });

    assert.deepEqual(result.data, []);
    assert.equal(result.meta.total, 32);
});

test('no modifica la lista original al ordenar', () => {
    const ids = alumnos.map((alumno) => alumno.id);

    listarAlumnos(alumnos, { sortBy: 'dni', order: 'desc' });

    assert.deepEqual(
        alumnos.map((alumno) => alumno.id),
        ids,
    );
});

test('rechaza parámetros inválidos con HTTP 400', () => {
    for (const query of [
        { page: 'abc' },
        { limit: '500' },
        { sortBy: 'password' },
        { order: 'otro' },
        { estado: 'cualquiera' },
        { search: ['Lucía', 'Martín'] },
        { email: ['a', 'b'] },
    ]) {
        assert.throws(() => listarAlumnos(alumnos, query), { status: 400 });
    }
});