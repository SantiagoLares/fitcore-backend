const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const { listarClases } = require("../dist/services/clases.js");

const clases = JSON.parse(
  fs.readFileSync("src/mocks/clases.json", "utf8"),
);
const horarios = JSON.parse(
  fs.readFileSync("src/mocks/horarios.json", "utf8"),
);

test("pagina y ordena por ID descendente", () => {
  const result = listarClases(clases, horarios, {
    page: "2",
    limit: "5",
    sortBy: "id",
    order: "desc",
  });

  assert.deepEqual(result.data.map((clase) => clase.id), [25, 24, 23, 22, 21]);
  assert.deepEqual(result.meta, {
    page: 2,
    limit: 5,
    total: 30,
    totalPages: 6,
  });
});

test("busca sin distinguir mayúsculas ni tildes", () => {
  const result = listarClases(clases, horarios, { search: "MÓVILIDAD" });

  assert.equal(result.meta.total, 5);
  assert.ok(result.data.every((clase) => clase.tipo === "Movilidad"));
});

test("combina filtros por tipo, profesor, día y cupo", () => {
  const result = listarClases(clases, horarios, {
    tipo: "Yoga",
    profesorId: "2",
    diaSemana: "martes",
    conCupo: "true",
  });

  assert.equal(result.meta.total, 4);
  assert.ok(result.data.every((clase) =>
    clase.tipo === "Yoga" &&
    clase.profesor.id === 2 &&
    clase.cuposDisponibles > 0
  ));
});

test("devuelve una lista vacía cuando no hay coincidencias", () => {
  const result = listarClases(clases, horarios, { nombre: "inexistente" });

  assert.deepEqual(result.data, []);
  assert.equal(result.meta.total, 0);
});

test("rechaza parámetros inválidos con HTTP 400", () => {
  for (const query of [
    { page: "abc" },
    { sortBy: "password" },
    { order: "otro" },
    { profesorId: "abc" },
    { diaSemana: "feriado" },
    { conCupo: "quizas" },
    { search: ["Yoga", "Pilates"] },
  ]) {
    assert.throws(() => listarClases(clases, horarios, query), {
      status: 400,
    });
  }
});