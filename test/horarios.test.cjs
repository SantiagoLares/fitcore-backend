const { test } = require('node:test');
const assert = require('node:assert/strict');

const { listarHorarios } = require('../dist/services/horarios.js');

const clases = [
  { id: 1, profesor: { id: 1 } },
  { id: 2, profesor: { id: 2 } },
  { id: 3, profesor: { id: 1 } },
];

const horarios = [
  {
    id: 1,
    claseId: 1,
    diaSemana: 'lunes',
    horaInicio: '09:00',
    horaFin: '10:00',
  },
  {
    id: 2,
    claseId: 2,
    diaSemana: 'miercoles',
    horaInicio: '11:00',
    horaFin: '12:00',
  },
  {
    id: 3,
    claseId: 1,
    diaSemana: 'viernes',
    horaInicio: '08:00',
    horaFin: '09:00',
  },
  {
    id: 4,
    claseId: 3,
    diaSemana: 'lunes',
    horaInicio: '15:00',
    horaFin: '16:00',
  },
  {
    id: 5,
    claseId: 2,
    diaSemana: 'domingo',
    horaInicio: '10:00',
    horaFin: '11:00',
  },
];

const ids = (resultado) => resultado.data.map((h) => h.id);

test('devuelve registros y metadatos con valores por defecto', () => {
  const resultado = listarHorarios(horarios, clases, {});

  assert.deepEqual(ids(resultado), [1, 4, 2, 3, 5]);

  assert.deepEqual(resultado.meta, {
    page: 1,
    limit: 10,
    total: 5,
    totalPages: 1,
  });
});

test('pagina y ordena por ID descendente', () => {
  const resultado = listarHorarios(horarios, clases, {
    page: '2',
    limit: '2',
    sortBy: 'id',
    order: 'desc',
  });

  assert.deepEqual(ids(resultado), [3, 2]);

  assert.deepEqual(resultado.meta, {
    page: 2,
    limit: 2,
    total: 5,
    totalPages: 3,
  });
});

test('ordena por día de semana descendente', () => {
  const resultado = listarHorarios(horarios, clases, {
    sortBy: 'diaSemana',
    order: 'desc',
  });

  assert.deepEqual(ids(resultado), [5, 3, 2, 4, 1]);
});

test('ordena por hora de inicio', () => {
  const resultado = listarHorarios(horarios, clases, {
    sortBy: 'horaInicio',
    order: 'asc',
  });

  assert.deepEqual(ids(resultado), [3, 1, 5, 2, 4]);
});

test('filtra por clase', () => {
  const resultado = listarHorarios(horarios, clases, {
    claseId: '1',
    sortBy: 'id',
  });

  assert.deepEqual(ids(resultado), [1, 3]);
  assert.equal(resultado.meta.total, 2);
});

test('filtra por día sin distinguir mayúsculas ni tildes', () => {
  const resultado = listarHorarios(horarios, clases, {
    diaSemana: 'MIÉRCOLES',
  });

  assert.deepEqual(ids(resultado), [2]);
  assert.equal(resultado.meta.total, 1);
});

test('filtra por profesor', () => {
  const resultado = listarHorarios(horarios, clases, {
    profesorId: '1',
    sortBy: 'id',
  });

  assert.deepEqual(ids(resultado), [1, 3, 4]);
  assert.equal(resultado.meta.total, 3);
});

test('combina filtros por clase, día y profesor', () => {
  const resultado = listarHorarios(horarios, clases, {
    claseId: '1',
    diaSemana: 'lunes',
    profesorId: '1',
  });

  assert.deepEqual(ids(resultado), [1]);
  assert.equal(resultado.meta.total, 1);
});

test('filtra antes de paginar', () => {
  const resultado = listarHorarios(horarios, clases, {
    profesorId: '1',
    page: '2',
    limit: '1',
    sortBy: 'id',
  });

  assert.deepEqual(ids(resultado), [3]);

  assert.deepEqual(resultado.meta, {
    page: 2,
    limit: 1,
    total: 3,
    totalPages: 3,
  });
});

test('devuelve una lista vacía si no hay coincidencias', () => {
  const resultado = listarHorarios(horarios, clases, {
    claseId: '999',
  });

  assert.deepEqual(resultado.data, []);
  assert.equal(resultado.meta.total, 0);
});

test('conserva los totales si la página está fuera de rango', () => {
  const resultado = listarHorarios(horarios, clases, {
    page: '10',
    limit: '2',
  });

  assert.deepEqual(resultado.data, []);

  assert.deepEqual(resultado.meta, {
    page: 10,
    limit: 2,
    total: 5,
    totalPages: 3,
  });
});

test('no modifica el arreglo original al ordenar', () => {
  const original = structuredClone(horarios);

  listarHorarios(horarios, clases, {
    sortBy: 'id',
    order: 'desc',
  });

  assert.deepEqual(horarios, original);
});

test('rechaza parámetros inválidos con HTTP 400', () => {
  for (const query of [
    { page: 'abc' },
    { page: '0' },
    { limit: '101' },
    { sortBy: 'password' },
    { order: 'otro' },
    { claseId: 'abc' },
    { claseId: '0' },
    { profesorId: '-1' },
    { profesorId: 'abc' },
    { diaSemana: 'feriado' },
    { diaSemana: ['lunes', 'martes'] },
  ]) {
    assert.throws(() => listarHorarios(horarios, clases, query), { status: 400 });
  }
});
