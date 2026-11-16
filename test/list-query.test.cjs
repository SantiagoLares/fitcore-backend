const { test } = require("node:test");
const assert = require("node:assert/strict");
const { queryList, readPagination } = require("../dist/http/list-query.js");

const items = [
  { id: 3, activo: true },
  { id: 1, activo: false },
  { id: 2, activo: true },
];

test("lee los parámetros de la URL y pagina después de filtrar y ordenar", () => {
  const result = queryList(items, {
    ...readPagination({ page: "2", limit: "1" }),
    filter: (item) => item.activo,
    compare: (a, b) => a.id - b.id,
  });

  assert.deepEqual(result, {
    items: [{ id: 3, activo: true }],
    pagination: { page: 2, limit: 1, total: 2, totalPages: 2 },
  });
});

test("usa los valores por defecto cuando no se envían parámetros", () => {
  const { pagination } = queryList(items, readPagination({}));
  assert.deepEqual(pagination, {
    page: 1, limit: 10, total: 3, totalPages: 1,
  });
});

test("rechaza parámetros inválidos con un error 400", () => {
  for (const query of [{ page: "abc" }, { page: ["1", "2"] }, { limit: "101" }]) {
    assert.throws(() => queryList(items, readPagination(query)), {
      status: 400,
      code: "INVALID_PAGINATION",
    });
  }
});