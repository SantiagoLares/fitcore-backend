const { test } = require("node:test");
const assert = require("node:assert/strict");
const { queryList, readPagination } = require("../dist/http/list-query.js");

const items = [
  { id: 3, activo: true },
  { id: 1, activo: false },
  { id: 2, activo: true },
];

test("pagina después de filtrar y ordenar usando el contrato data/meta", () => {
  const result = queryList(items, {
    ...readPagination({ page: "2", limit: "1" }),
    filter: (item) => item.activo,
    compare: (a, b) => a.id - b.id,
  });

  assert.deepEqual(result, {
    data: [{ id: 3, activo: true }],
    meta: { page: 2, limit: 1, total: 2, totalPages: 2 },
  });
});

test("usa los valores por defecto", () => {
  const { meta } = queryList(items, readPagination({}));

  assert.deepEqual(meta, {
    page: 1,
    limit: 10,
    total: 3,
    totalPages: 1,
  });
});

test("rechaza parámetros inválidos con un error 400", () => {
  const queries = [
    { page: "abc" },
    { page: "0" },
    { page: ["1", "2"] },
    { limit: "101" },
  ];

  for (const query of queries) {
    assert.throws(() => queryList(items, readPagination(query)), {
      status: 400,
      code: "INVALID_PAGINATION",
    });
  }
});

test("devuelve una página vacía conservando los totales", () => {
  assert.deepEqual(queryList(items, { page: 5, limit: 2 }), {
    data: [],
    meta: { page: 5, limit: 2, total: 3, totalPages: 2 },
  });
});

test("ordenar no modifica el arreglo original", () => {
  queryList(items, { compare: (a, b) => a.id - b.id });

  assert.deepEqual(items.map((item) => item.id), [3, 1, 2]);
});