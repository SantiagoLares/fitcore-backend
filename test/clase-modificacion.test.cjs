const { test } = require("node:test");
const assert = require("node:assert/strict");
const { modificarClase } = require("../dist/services/clases-write.js");

const profesores = [
  { id: 1, nombre: "Martín", apellido: "López" },
  { id: 2, nombre: "Lucía", apellido: "Fernández" },
];

function claseInicial() {
  return {
    id: 1,
    nombre: "Funcional",
    tipo: "Funcional",
    cupoMaximo: 20,
    cuposOcupados: 8,
    cuposDisponibles: 12,
    profesor: { ...profesores[0] },
  };
}

function bodyValido() {
  return {
    nombre: "Yoga tarde",
    tipo: "Yoga",
    cupoMaximo: 10,
    profesorId: 2,
  };
}

test("modifica la clase y recalcula cupos sin cambiar los ocupados", () => {
  const clases = [claseInicial()];

  const resultado = modificarClase(
    clases,
    profesores,
    "1",
    bodyValido(),
  );

  assert.deepEqual(resultado, {
    id: 1,
    nombre: "Yoga tarde",
    tipo: "Yoga",
    cupoMaximo: 10,
    cuposOcupados: 8,
    cuposDisponibles: 2,
    profesor: profesores[1],
  });

  assert.deepEqual(clases, [resultado]);
});

test("permite un cupo máximo igual a los ocupados", () => {
  const resultado = modificarClase(
    [claseInicial()],
    profesores,
    "1",
    { ...bodyValido(), cupoMaximo: 8 },
  );

  assert.equal(resultado.cuposDisponibles, 0);
});

test("rechaza reducir el cupo por debajo de los ocupados sin modificar", () => {
  const clases = [claseInicial()];
  const antes = structuredClone(clases);

  assert.throws(
    () => modificarClase(
      clases,
      profesores,
      "1",
      { ...bodyValido(), cupoMaximo: 7 },
    ),
    { status: 409, code: "CAPACITY_CONFLICT" },
  );

  assert.deepEqual(clases, antes);
});

test("rechaza campos ausentes o inválidos sin modificar la clase", () => {
  const invalidos = [
    null,
    {},
    { ...bodyValido(), nombre: " " },
    { ...bodyValido(), tipo: 12 },
    { ...bodyValido(), cupoMaximo: 0 },
    { ...bodyValido(), cupoMaximo: 10.5 },
    { ...bodyValido(), profesorId: 999 },
  ];

  for (const campo of ["nombre", "tipo", "cupoMaximo", "profesorId"]) {
    const body = bodyValido();
    delete body[campo];
    invalidos.push(body);
  }

  for (const body of invalidos) {
    const clases = [claseInicial()];
    const antes = structuredClone(clases);

    assert.throws(
      () => modificarClase(clases, profesores, "1", body),
      { status: 400 },
    );

    assert.deepEqual(clases, antes);
  }
});

test("devuelve 404 si no existe y 400 para un ID inválido", () => {
  assert.throws(
    () => modificarClase(
      [claseInicial()], profesores, "999999", bodyValido(),
    ),
    { status: 404 },
  );

  assert.throws(
    () => modificarClase(
      [claseInicial()], profesores, "abc", bodyValido(),
    ),
    { status: 400 },
  );
});