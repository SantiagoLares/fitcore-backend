const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const { obtenerClasePorId } = require("../dist/services/clases.js");

const clases = JSON.parse(
  fs.readFileSync("src/mocks/clases.json", "utf8"),
);
const horarios = JSON.parse(
  fs.readFileSync("src/mocks/horarios.json", "utf8"),
);

test("devuelve la clase con todos sus horarios y excluye los de otras clases", () => {
  const horariosPrueba = [
    { id: 1, claseId: 1, diaSemana: "lunes", horaInicio: "08:00", horaFin: "09:00" },
    { id: 2, claseId: 1, diaSemana: "viernes", horaInicio: "08:00", horaFin: "09:00" },
    { id: 3, claseId: 2, diaSemana: "martes", horaInicio: "10:00", horaFin: "11:00" },
  ];

  const result = obtenerClasePorId(clases, horariosPrueba, "1");

  assert.deepEqual(result, {
    ...clases.find((clase) => clase.id === 1),
    horarios: horariosPrueba.slice(0, 2),
  });
});

test("devuelve 404 para un ID válido que no existe", () => {
  assert.throws(() => obtenerClasePorId(clases, horarios, "999999"), {
    status: 404,
    code: "CLASS_NOT_FOUND",
  });
});

test("devuelve 400 para IDs inválidos", () => {
  for (const id of ["abc", "0", "-1", "1.5", "1abc", "9007199254740992"]) {
    assert.throws(() => obtenerClasePorId(clases, horarios, id), {
      status: 400,
      code: "INVALID_ID",
    });
  }
});