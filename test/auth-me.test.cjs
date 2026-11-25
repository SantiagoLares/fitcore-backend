process.env.JWT_SECRET = 'clave-de-prueba';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { usuarioIdDelToken } = require('../dist/http/auth.js');
const {
  PASSWORD_DEMO,
  crearCredenciales,
  iniciarSesion,
  modificarPerfil,
  obtenerPerfil,
} = require('../dist/services/auth.js');
const app = require('../dist/app.js').default;

const perfiles = {
  alumnos: [{ id: 1, usuarioId: 11 }],
  profesores: [{ id: 1, usuarioId: 101 }],
};

function datos() {
  const usuarios = [
    {
      id: 1,
      nombre: 'Ana Pérez',
      email: 'admin@fitcore.com',
      perfil: 'Administración',
      activo: true,
    },
    { id: 11, nombre: 'Lucía Gómez', email: 'lucia@mail.com', perfil: 'Alumno', activo: true },
    {
      id: 13,
      nombre: 'Alumno Inactivo',
      email: 'inactivo@mail.com',
      perfil: 'Alumno',
      activo: false,
    },
    {
      id: 101,
      nombre: 'Federico Martínez',
      email: 'federico@mail.com',
      perfil: 'Profesor',
      activo: true,
    },
  ];

  return { usuarios, credenciales: crearCredenciales(usuarios) };
}

function errorHttp(status) {
  return (error) => {
    assert.equal(error.status, status);
    return true;
  };
}

function bearer(payload, opciones = {}, secreto = 'clave-de-prueba') {
  return `Bearer ${jwt.sign(payload, secreto, { expiresIn: '8h', ...opciones })}`;
}

// Token

test('un token válido devuelve el id del usuario', () => {
  assert.equal(usuarioIdDelToken(bearer({ perfil: 'Alumno' }, { subject: '11' })), 11);
});

test('sin token, con token inválido o vencido da 401', () => {
  const vencido = bearer({}, { subject: '11', expiresIn: -10 });
  const otraClave = bearer({}, { subject: '11' }, 'otra-clave');

  for (const encabezado of [
    undefined,
    '',
    'Bearer',
    'Basic abc',
    'Bearer basura',
    vencido,
    otraClave,
  ]) {
    assert.throws(() => usuarioIdDelToken(encabezado), errorHttp(401), String(encabezado));
  }
});

// GET /auth/me

test('obtenerPerfil agrega alumnoId o profesorId según el perfil', () => {
  const { usuarios } = datos();

  assert.deepEqual(obtenerPerfil(usuarios, perfiles, 11), { ...usuarios[1], alumnoId: 1 });
  assert.deepEqual(obtenerPerfil(usuarios, perfiles, 101), { ...usuarios[3], profesorId: 1 });
  assert.deepEqual(obtenerPerfil(usuarios, perfiles, 1), usuarios[0]);
});

test('obtenerPerfil de un usuario inexistente o inactivo da 401', () => {
  const { usuarios } = datos();

  assert.throws(() => obtenerPerfil(usuarios, perfiles, 999), errorHttp(401));
  assert.throws(() => obtenerPerfil(usuarios, perfiles, 13), errorHttp(401));
});

// PUT /auth/me

test('modificarPerfil cambia nombre, email y contraseña', () => {
  const { usuarios, credenciales } = datos();

  const resultado = modificarPerfil(usuarios, credenciales, perfiles, 11, {
    nombre: 'Lucía G.',
    email: 'Lucia.Nueva@mail.com',
    password: 'nueva1234',
  });

  assert.deepEqual(resultado, {
    id: 11,
    nombre: 'Lucía G.',
    email: 'lucia.nueva@mail.com',
    perfil: 'Alumno',
    activo: true,
    alumnoId: 1,
  });
  assert.equal(
    iniciarSesion(usuarios, credenciales, { email: 'lucia.nueva@mail.com', password: 'nueva1234' })
      .usuario.id,
    11,
  );
  assert.throws(
    () =>
      iniciarSesion(usuarios, credenciales, {
        email: 'lucia.nueva@mail.com',
        password: PASSWORD_DEMO,
      }),
    errorHttp(401),
  );
});

test('modificarPerfil sin password mantiene la contraseña e ignora perfil y activo', () => {
  const { usuarios, credenciales } = datos();

  const resultado = modificarPerfil(usuarios, credenciales, perfiles, 11, {
    nombre: 'Lucía Gómez',
    email: 'lucia@mail.com',
    perfil: 'Administración',
    activo: false,
  });

  assert.equal(resultado.perfil, 'Alumno');
  assert.equal(resultado.activo, true);
  assert.equal(
    iniciarSesion(usuarios, credenciales, { email: 'lucia@mail.com', password: PASSWORD_DEMO })
      .usuario.id,
    11,
  );
});

test('modificarPerfil con el email de otro usuario da 409', () => {
  const { usuarios, credenciales } = datos();

  assert.throws(
    () =>
      modificarPerfil(usuarios, credenciales, perfiles, 11, {
        nombre: 'Lucía Gómez',
        email: 'ADMIN@fitcore.com',
      }),
    errorHttp(409),
  );
  assert.equal(usuarios[1].email, 'lucia@mail.com');
});

test('modificarPerfil con datos inválidos da 400 y no cambia nada', () => {
  const { usuarios, credenciales } = datos();
  const valido = { nombre: 'Lucía Gómez', email: 'lucia@mail.com' };

  for (const cambio of [
    { nombre: '' },
    { email: undefined },
    { email: 'no-es-un-email' },
    { password: 'corta' },
    { password: 12345678 },
  ]) {
    assert.throws(
      () => modificarPerfil(usuarios, credenciales, perfiles, 11, { ...valido, ...cambio }),
      errorHttp(400),
    );
  }
  assert.throws(() => modificarPerfil(usuarios, credenciales, perfiles, 11, null), errorHttp(400));
  assert.deepEqual(usuarios[1], datos().usuarios[1]);
});

// Rutas HTTP

test('las rutas /api/v1/auth/me responden con el formato y los códigos del contrato', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/auth`;
  const pedir = (metodo, ruta, { token, body } = {}) =>
    fetch(`${base}${ruta}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  try {
    let res = await pedir('GET', '/me');
    assert.equal(res.status, 401);
    assert.equal(typeof (await res.json()).error, 'string');

    res = await pedir('POST', '/login', {
      body: { email: 'lucia.gomez88@gmail.com', password: PASSWORD_DEMO },
    });
    const { token } = (await res.json()).data;

    res = await pedir('GET', '/me', { token });
    let body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.data.id, 11);
    assert.equal(body.data.alumnoId, 1);

    res = await pedir('PUT', '/me', {
      token,
      body: { nombre: 'Lucía Gómez', email: 'lucia.gomez@mail.com' },
    });
    body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.data.email, 'lucia.gomez@mail.com');

    res = await pedir('PUT', '/me', {
      token,
      body: { nombre: 'Lucía Gómez', email: 'admin@fitcore.com' },
    });
    assert.equal(res.status, 409);

    res = await pedir('PUT', '/me', { token, body: { nombre: '' } });
    assert.equal(res.status, 400);

    res = await pedir('PUT', '/me', { body: { nombre: 'X', email: 'x@mail.com' } });
    assert.equal(res.status, 401);
  } finally {
    servidor.close();
  }
});
