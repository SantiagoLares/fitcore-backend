const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { listarProfesores } = require('../dist/services/profesores.js');

const profesores = JSON.parse(fs.readFileSync('src/mocks/profesores.json', 'utf8'));

test('pagina y ordena por apellido ascendente por defecto', () => {
  const result = listarProfesores(profesores, {
    page: '1',
    limit: '5',
  });

  assert.equal(result.data.length, 5);
  assert.deepEqual(result.meta, {
    page: 1,
    limit: 5,
    total: 30,
    totalPages: 6,
  });

  assert.deepEqual(
    result.data.map((profesor) => profesor.apellido),
    [...result.data.map((profesor) => profesor.apellido)].sort((a, b) => a.localeCompare(b, 'es')),
  );
});

test('ordena por nombre descendente', () => {
  const result = listarProfesores(profesores, {
    sortBy: 'nombre',
    order: 'desc',
  });

  assert.deepEqual(
    result.data.map((profesor) => profesor.nombre),
    [...result.data.map((profesor) => profesor.nombre)].sort((a, b) => b.localeCompare(a, 'es')),
  );
});

test('busca por apellido, nombre o DNI', () => {
  const profesor = profesores[0];

  for (const search of [profesor.apellido, profesor.nombre, profesor.dni]) {
    const result = listarProfesores(profesores, { search });

    assert.ok(result.data.some((item) => item.id === profesor.id));
  }
});

test('busca sin distinguir mayúsculas ni tildes', () => {
  const campos = profesores.flatMap((profesor) => [
    { id: profesor.id, valor: profesor.nombre },
    { id: profesor.id, valor: profesor.apellido },
  ]);

  const campo = campos.find((item) => /[áéíóú]/i.test(item.valor));

  assert.ok(campo, 'Debe existir un nombre o apellido con tilde');

  const busqueda = campo.valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const result = listarProfesores(profesores, {
    search: busqueda,
    limit: '100',
  });

  assert.ok(result.data.some((item) => item.id === campo.id));
});

test('filtra por especialidad', () => {
  const especialidad = profesores[0].especialidad;

  const result = listarProfesores(profesores, {
    especialidad,
  });

  assert.ok(result.data.length > 0);
  assert.ok(result.data.every((profesor) => profesor.especialidad === especialidad));
});

test('combina búsqueda y filtro por especialidad', () => {
  const profesor = profesores[0];

  const result = listarProfesores(profesores, {
    search: profesor.apellido,
    especialidad: profesor.especialidad,
  });

  assert.ok(result.data.some((item) => item.id === profesor.id));

  assert.ok(result.data.every((item) => item.especialidad === profesor.especialidad));
});

test('devuelve una lista vacía cuando no hay coincidencias', () => {
  const result = listarProfesores(profesores, {
    search: 'profesorinexistente',
  });

  assert.deepEqual(result.data, []);
  assert.equal(result.meta.total, 0);
});

test('rechaza parámetros inválidos con HTTP 400', () => {
  for (const query of [
    { page: 'abc' },
    { sortBy: 'password' },
    { order: 'otro' },
    { search: ['Juan', 'Pedro'] },
    { especialidad: ['Yoga', 'Pilates'] },
  ]) {
    assert.throws(() => listarProfesores(profesores, query), { status: 400 });
  }
});
