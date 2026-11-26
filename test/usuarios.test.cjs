process.env.JWT_SECRET = 'clave-de-prueba';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { verificarPerfil } = require('../dist/http/auth.js');
const { listarUsuarios } = require('../dist/services/usuarios.js');
const app = require('../dist/app.js').default;
const usuariosMock = require('../dist/mocks/usuarios.json');

const usuarios = [
  {
    id: 1,
    nombre: 'Ana Pérez',
    email: 'admin@fitcore.com',
    perfil: 'Administración',
    activo: true,
  },
  { id: 11, nombre: 'Lucía Gómez', email: 'lucia@mail.com', perfil: 'Alumno', activo: true },
  { id: 12, nombre: 'Martín Fernández', email: 'martin@mail.com', perfil: 'Alumno', activo: true },
  { id: 13, nombre: 'Bruno Díaz', email: 'bruno@mail.com', perfil: 'Alumno', activo: false },
  {
    id: 101,
    nombre: 'Federico Martínez',
    email: 'fede@gimnasio.com',
    perfil: 'Profesor',
    activo: true,
  },
];

const ids = (resultado) => resultado.data.map((u) => u.id);

function errorHttp(status) {
  return (error) => {
    assert.equal(error.status, status);
    return true;
  };
}

// Listado

test('por defecto ordena por nombre ascendente con page 1 y limit 10', () => {
  const resultado = listarUsuarios(usuarios, {});

  assert.deepEqual(ids(resultado), [1, 13, 101, 11, 12]);
  assert.deepEqual(resultado.meta, { page: 1, limit: 10, total: 5, totalPages: 1 });
});

test('ordena por id, email y nombre en ambos sentidos', () => {
  assert.deepEqual(
    ids(listarUsuarios(usuarios, { sortBy: 'id', order: 'desc' })),
    [101, 13, 12, 11, 1],
  );
  assert.deepEqual(ids(listarUsuarios(usuarios, { sortBy: 'email' })), [1, 13, 101, 11, 12]);
  assert.deepEqual(
    ids(listarUsuarios(usuarios, { sortBy: 'nombre', order: 'desc' })),
    [12, 11, 101, 13, 1],
  );
});

test('pagina después de filtrar y ordenar', () => {
  const resultado = listarUsuarios(usuarios, { sortBy: 'id', page: '2', limit: '2' });

  assert.deepEqual(ids(resultado), [12, 13]);
  assert.deepEqual(resultado.meta, { page: 2, limit: 2, total: 5, totalPages: 3 });
});

test('una página mayor que totalPages devuelve data vacía con el total real', () => {
  const resultado = listarUsuarios(usuarios, { page: '9', limit: '2' });

  assert.deepEqual(resultado.data, []);
  assert.deepEqual(resultado.meta, { page: 9, limit: 2, total: 5, totalPages: 3 });
});

test('search busca en nombre o email, sin mayúsculas ni tildes', () => {
  assert.deepEqual(ids(listarUsuarios(usuarios, { search: 'LUCIA' })), [11]);
  assert.deepEqual(ids(listarUsuarios(usuarios, { search: 'martin' })), [101, 12]);
  assert.deepEqual(ids(listarUsuarios(usuarios, { search: 'gimnasio' })), [101]);
});

test('filtra por perfil y por activo, combinables entre sí', () => {
  assert.deepEqual(ids(listarUsuarios(usuarios, { perfil: 'Alumno', sortBy: 'id' })), [11, 12, 13]);
  assert.deepEqual(ids(listarUsuarios(usuarios, { perfil: 'Administracion' })), [1]);
  assert.deepEqual(ids(listarUsuarios(usuarios, { activo: 'false' })), [13]);

  const resultado = listarUsuarios(usuarios, { perfil: 'Alumno', activo: 'true', search: 'mar' });
  assert.deepEqual(ids(resultado), [12]);
  assert.equal(resultado.meta.total, 1);
});

test('parámetros inválidos dan 400', () => {
  for (const query of [
    { page: 'abc' },
    { page: '0' },
    { limit: '500' },
    { sortBy: 'perfil' },
    { order: 'arriba' },
    { perfil: 'Invitado' },
    { activo: 'si' },
    { search: ['a', 'b'] },
  ]) {
    assert.throws(() => listarUsuarios(usuarios, query), errorHttp(400), JSON.stringify(query));
  }
});

test('no devuelve contraseñas ni permite modificar el estado desde la respuesta', () => {
  const resultado = listarUsuarios(usuarios, {});

  for (const usuario of resultado.data) {
    assert.deepEqual(Object.keys(usuario), ['id', 'nombre', 'email', 'perfil', 'activo']);
  }
  resultado.data[0].nombre = 'Cambiado';
  assert.equal(usuarios[0].nombre, 'Ana Pérez');
});

// Permisos

test('verificarPerfil: 403 con otro perfil, 401 si el usuario no existe o está inactivo', () => {
  assert.equal(verificarPerfil(usuarios, 1, ['Administración']).id, 1);
  assert.throws(() => verificarPerfil(usuarios, 11, ['Administración']), errorHttp(403));
  assert.throws(() => verificarPerfil(usuarios, 999, ['Administración']), errorHttp(401));
  assert.throws(() => verificarPerfil(usuarios, 13, ['Alumno']), errorHttp(401));
});

// Ruta HTTP

test('GET /api/v1/usuarios responde según el contrato y solo para Administración', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/usuarios`;
  const token = (id) => jwt.sign({}, 'clave-de-prueba', { subject: String(id), expiresIn: '1h' });
  const pedir = (ruta, id) =>
    fetch(`${base}${ruta}`, { headers: id ? { Authorization: `Bearer ${token(id)}` } : {} });

  try {
    let res = await pedir('');
    assert.equal(res.status, 401);

    res = await pedir('', 11);
    assert.equal(res.status, 403);
    assert.equal(typeof (await res.json()).error, 'string');

    res = await pedir('', 101);
    assert.equal(res.status, 403);

    res = await pedir('?page=1&limit=10&sortBy=id&order=desc', 1);
    let body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.data.length, 10);
    assert.equal(body.data[0].id, Math.max(...usuariosMock.map((u) => u.id)));
    assert.deepEqual(body.meta, {
      page: 1,
      limit: 10,
      total: usuariosMock.length,
      totalPages: Math.ceil(usuariosMock.length / 10),
    });

    res = await pedir('?perfil=Alumno&activo=false', 1);
    body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.data.every((u) => u.perfil === 'Alumno' && u.activo === false));
    assert.equal(
      body.meta.total,
      usuariosMock.filter((u) => u.perfil === 'Alumno' && !u.activo).length,
    );

    res = await pedir('?sortBy=perfil', 1);
    assert.equal(res.status, 400);
  } finally {
    servidor.close();
  }
});
