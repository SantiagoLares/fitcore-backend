const { test } = require("node:test");
const assert = require("node:assert/strict");
const { eliminarClase } = require("../dist/services/clases-write.js");

function preparar(ocupados = 0) {
  return {
    clases: [
      {
        id: 1,
        nombre: "Funcional",
        tipo: "Funcional",
        cupoMaximo: 20,
        cuposOcupados: ocupados,
        cuposDisponibles: 20 - ocupados,
        profesor: { id: 1, nombre: "Martín", apellido: "López" },
      },
      {
        id: 2,
        nombre: "Yoga",
        tipo: "Yoga",
        cupoMaximo: 10,
        cuposOcupados: 0,
        cuposDisponibles: 10,
        profesor: { id: 2, nombre: "Lucía", apellido: "Fernández" },
      },
    ],
    horarios: [
      {
        id: 1, claseId: 1, diaSemana: "lunes",
        horaInicio: "08:00", horaFin: "09:00",
      },
      {
        id: 2, claseId: 1, diaSemana: "viernes",
        horaInicio: "08:00", horaFin: "09:00",
      },
      {
        id: 3, claseId: 2, diaSemana: "martes",
        horaInicio: "10:00", horaFin: "11:00",
      },
    ],
  };
}

test("elimina la clase y sus horarios conservando las otras clases", () => {
  const { clases, horarios } = preparar();
  const otraClase = structuredClone(clases[1]);
  const otroHorario = structuredClone(horarios[2]);

  eliminarClase(clases, horarios, "1");

  assert.deepEqual(clases, [otraClase]);
  assert.deepEqual(horarios, [otroHorario]);
});

test("rechaza eliminar una clase con inscripciones activas sin modificar datos", () => {
  const datos = preparar(5);
  const antes = structuredClone(datos);

  assert.throws(
    () => eliminarClase(datos.clases, datos.horarios, "1"),
    { status: 409, code: "ACTIVE_ENROLLMENTS" },
  );

  assert.deepEqual(datos, antes);
});

test("devuelve 404 para una clase inexistente y 400 para ID inválido", () => {
  const datos = preparar();
  const antes = structuredClone(datos);

  assert.throws(
    () => eliminarClase(datos.clases, datos.horarios, "999999"),
    { status: 404 },
  );

  assert.throws(
    () => eliminarClase(datos.clases, datos.horarios, "abc"),
    { status: 400 },
  );

  assert.deepEqual(datos, antes);
});