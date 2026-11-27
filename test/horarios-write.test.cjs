const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  crearHorario,
  modificarHorario,
  eliminarHorario,
} = require('../dist/services/horarios-write.js');

const clases = [{ id: 1 }, { id: 2 }];

const horariosBase = [
  {
    id: 1,
    claseId: 1,
    diaSemana: 'lunes',
    horaInicio: '09:00',
    horaFin: '10:00',
  },
  {
    id: 2,
    claseId: 1,
    diaSemana: 'viernes',
    horaInicio: '09:00',
    horaFin: '10:00',
  },
  {
    id: 3,
    claseId: 2,
    diaSemana: 'martes',
    horaInicio: '15:00',
    horaFin: '16:00',
  },
];

const datosValidos = {
  claseId: 1,
  diaSemana: 'miercoles',
  horaInicio: '14:00',
  horaFin: '15:00',
};

function prepararHorarios() {
  return structuredClone(horariosBase);
}

// ALTA

test('crea un horario con un ID generado y lo almacena', () => {
  const horarios = prepararHorarios();

  const resultado = crearHorario(horarios, clases, datosValidos);

  assert.deepEqual(resultado, {
    id: 4,
    ...datosValidos,
  });

  assert.equal(horarios.length, 4);
  assert.deepEqual(horarios[3], resultado);
});

test('ignora el ID enviado por el usuario', () => {
  const horarios = prepararHorarios();

  const resultado = crearHorario(horarios, clases, {
    ...datosValidos,
    id: 999,
  });

  assert.equal(resultado.id, 4);
});

test('rechaza campos obligatorios ausentes sin guardar datos', () => {
  const horarios = prepararHorarios();

  for (const campo of Object.keys(datosValidos)) {
    const entrada = { ...datosValidos };
    delete entrada[campo];

    assert.throws(() => crearHorario(horarios, clases, entrada), { status: 400 });
  }

  assert.deepEqual(horarios, horariosBase);
});

test('rechaza una clase inexistente', () => {
  const horarios = prepararHorarios();

  assert.throws(
    () =>
      crearHorario(horarios, clases, {
        ...datosValidos,
        claseId: 999,
      }),
    { status: 400 },
  );

  assert.deepEqual(horarios, horariosBase);
});

test('rechaza datos inválidos sin guardar horarios', () => {
  const horarios = prepararHorarios();

  for (const datos of [
    { claseId: 0 },
    { claseId: '1' },
    { claseId: -1 },
    { diaSemana: 'feriado' },
    { horaInicio: '25:00' },
    { horaInicio: '9:00' },
    { horaFin: '15:60' },
    { horaFin: '14:00' },
    { horaFin: '13:00' },
  ]) {
    assert.throws(
      () =>
        crearHorario(horarios, clases, {
          ...datosValidos,
          ...datos,
        }),
      { status: 400 },
    );
  }

  assert.deepEqual(horarios, horariosBase);
});

test('rechaza cuerpos que no son objetos JSON', () => {
  const horarios = prepararHorarios();

  for (const body of [null, [], 'texto', 123, undefined]) {
    assert.throws(() => crearHorario(horarios, clases, body), { status: 400 });
  }

  assert.deepEqual(horarios, horariosBase);
});

// MODIFICACIÓN

test('modifica un horario conservando su ID y clase', () => {
  const horarios = prepararHorarios();

  const resultado = modificarHorario(horarios, '1', {
    diaSemana: 'jueves',
    horaInicio: '18:00',
    horaFin: '19:00',
  });

  assert.deepEqual(resultado, {
    id: 1,
    claseId: 1,
    diaSemana: 'jueves',
    horaInicio: '18:00',
    horaFin: '19:00',
  });

  assert.deepEqual(horarios[0], resultado);
  assert.equal(horarios.length, 3);
});

test('rechaza modificar un horario inexistente', () => {
  const horarios = prepararHorarios();

  assert.throws(() => modificarHorario(horarios, '999', datosValidos), { status: 404 });
});

test('rechaza modificar un horario con ID inválido', () => {
  const horarios = prepararHorarios();

  for (const id of ['abc', '0', '-1', '1.5']) {
    assert.throws(() => modificarHorario(horarios, id, datosValidos), { status: 400 });
  }
});

test('rechaza cambiar la clase asociada al horario', () => {
  const horarios = prepararHorarios();

  assert.throws(
    () =>
      modificarHorario(horarios, '1', {
        ...datosValidos,
        claseId: 2,
      }),
    { status: 400 },
  );

  assert.deepEqual(horarios, horariosBase);
});

test('rechaza modificaciones inválidas sin alterar los datos', () => {
  const horarios = prepararHorarios();

  for (const datos of [
    {},
    { diaSemana: 'lunes' },
    { ...datosValidos, diaSemana: 'feriado' },
    { ...datosValidos, horaFin: '10:00' },
    { ...datosValidos, horaInicio: '99:00' },
  ]) {
    assert.throws(() => modificarHorario(horarios, '1', datos), { status: 400 });
  }

  assert.deepEqual(horarios, horariosBase);
});

// BAJA

test('elimina un horario conservando los demás registros', () => {
  const horarios = prepararHorarios();

  eliminarHorario(horarios, '1');

  assert.equal(horarios.length, 2);
  assert.deepEqual(horarios, horariosBase.slice(1));
});

test('rechaza eliminar el último horario de una clase', () => {
  const horarios = prepararHorarios();

  assert.throws(() => eliminarHorario(horarios, '3'), { status: 409 });

  assert.deepEqual(horarios, horariosBase);
});

test('rechaza eliminar un horario inexistente', () => {
  const horarios = prepararHorarios();

  assert.throws(() => eliminarHorario(horarios, '999'), { status: 404 });
});

test('rechaza eliminar un horario con ID inválido', () => {
  const horarios = prepararHorarios();

  for (const id of ['abc', '0', '-1', '1.5']) {
    assert.throws(() => eliminarHorario(horarios, id), { status: 400 });
  }
});
