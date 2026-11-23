const { test } = require("node:test");
const assert = require("node:assert/strict");
const { crearClase } = require("../dist/services/clases-write.js");

const profesores = [
  { id: 1, nombre: "Martín", apellido: "López" },
];

function datosValidos() {
  return {
    nombre: "Funcional mañana",
    tipo: "Funcional",
    cupoMaximo: 20,
    profesorId: 1,
    horarios: [
      {
        diaSemana: "lunes",
        horaInicio: "08:00",
        horaFin: "09:00",
      },
      {
        diaSemana: "miercoles",
        horaInicio: "08:00",
        horaFin: "09:00",
      },
    ],
  };
}

test("crea una clase con cupos disponibles y todos sus horarios", () => {
  const clases = [];
  const horarios = [];

  const resultado = crearClase(
    clases,
    horarios,
    profesores,
    datosValidos(),
  );

  assert.equal(resultado.id, 1);
  assert.equal(resultado.cuposOcupados, 0);
  assert.equal(resultado.cuposDisponibles, 20);
  assert.deepEqual(resultado.profesor, profesores[0]);
  assert.equal(clases.length, 1);
  assert.equal(horarios.length, 2);
  assert.deepEqual(resultado.horarios, horarios);
  assert.deepEqual(horarios.map((item) => item.id), [1, 2]);
  assert.ok(horarios.every((item) => item.claseId === resultado.id));

  const segunda = crearClase(
    clases,
    horarios,
    profesores,
    datosValidos(),
  );

  assert.equal(segunda.id, 2);
  assert.deepEqual(segunda.horarios.map((item) => item.id), [3, 4]);
});

test("rechaza campos obligatorios ausentes sin guardar datos", () => {
  for (const campo of [
    "nombre",
    "tipo",
    "cupoMaximo",
    "profesorId",
    "horarios",
  ]) {
    const body = datosValidos();
    delete body[campo];

    const clases = [];
    const horarios = [];

    assert.throws(
      () => crearClase(clases, horarios, profesores, body),
      { status: 400 },
    );

    assert.deepEqual(clases, []);
    assert.deepEqual(horarios, []);
  }
});

test("rechaza cuerpos, cupos, profesores y horarios inválidos", () => {
  const base = datosValidos();
  const invalidos = [
    null,
    [],
    { ...base, nombre: " " },
    { ...base, tipo: 12 },
    { ...base, cupoMaximo: 0 },
    { ...base, cupoMaximo: 1.5 },
    { ...base, cupoMaximo: "20" },
    { ...base, profesorId: 999 },
    { ...base, profesorId: "1" },
    { ...base, horarios: [] },
    { ...base, horarios: [null] },
    {
      ...base,
      horarios: [{ ...base.horarios[0], diaSemana: "feriado" }],
    },
    {
      ...base,
      horarios: [{ ...base.horarios[0], horaInicio: "25:00" }],
    },
    {
      ...base,
      horarios: [{ ...base.horarios[0], horaFin: "08:00" }],
    },
    {
      ...base,
      horarios: [{ ...base.horarios[0], horaFin: "07:00" }],
    },
  ];

  for (const body of invalidos) {
    assert.throws(
      () => crearClase([], [], profesores, body),
      { status: 400 },
    );
  }
});

test("un segundo horario inválido no guarda parcialmente la clase", () => {
  const clases = [];
  const horarios = [];
  const body = datosValidos();
  body.horarios[1].horaFin = "07:00";

  assert.throws(
    () => crearClase(clases, horarios, profesores, body),
    { status: 400 },
  );

  assert.deepEqual(clases, []);
  assert.deepEqual(horarios, []);
});