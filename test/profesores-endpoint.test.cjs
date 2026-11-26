process.env.JWT_SECRET = 'clave-de-prueba';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = require('../dist/app.js').default;

const profesores = JSON.parse(fs.readFileSync('src/mocks/profesores.json', 'utf8'));

test('GET /api/v1/profesores respeta el contrato de la API', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/profesores`;

  try {
    // Listado y paginación por defecto
    let res = await fetch(base);
    let body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.data.length, 10);
    assert.deepEqual(body.meta, {
      page: 1,
      limit: 10,
      total: profesores.length,
      totalPages: Math.ceil(profesores.length / 10),
    });

    // Paginación personalizada
    res = await fetch(`${base}?page=2&limit=5`);
    body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.data.length, 5);
    assert.deepEqual(body.meta, {
      page: 2,
      limit: 5,
      total: profesores.length,
      totalPages: Math.ceil(profesores.length / 5),
    });

    // Ordenamiento descendente
    res = await fetch(`${base}?sortBy=nombre&order=desc`);
    body = await res.json();

    assert.equal(res.status, 200);

    const normalizar = (valor) =>
      valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const nombres = body.data.map((profesor) => normalizar(profesor.nombre));

    assert.deepEqual(
      nombres,
      [...nombres].sort((a, b) => b.localeCompare(a, 'es')),
    );

    // Búsqueda por apellido, nombre o DNI
    const profesor = profesores[0];

    for (const search of [profesor.apellido, profesor.nombre, profesor.dni]) {
      res = await fetch(`${base}?search=${encodeURIComponent(search)}&limit=100`);
      body = await res.json();

      assert.equal(res.status, 200);
      assert.ok(body.data.some((item) => item.id === profesor.id));
    }

    // Filtro por especialidad
    res = await fetch(`${base}?especialidad=${encodeURIComponent(profesor.especialidad)}`);
    body = await res.json();

    assert.equal(res.status, 200);
    assert.ok(body.data.length > 0);
    assert.ok(body.data.every((item) => item.especialidad === profesor.especialidad));

    // Búsqueda sin coincidencias
    res = await fetch(`${base}?search=profesorinexistente`);
    body = await res.json();

    assert.equal(res.status, 200);
    assert.deepEqual(body.data, []);
    assert.equal(body.meta.total, 0);

    // Parámetros inválidos
    for (const query of ['page=0', 'page=abc', 'limit=0', 'sortBy=password', 'order=otro']) {
      res = await fetch(`${base}?${query}`);
      body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(typeof body.error, 'string');
    }
  } finally {
    servidor.close();
  }
});
