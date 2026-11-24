process.env.JWT_SECRET = 'clave-de-prueba';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const {
  PASSWORD_DEMO,
  crearCredenciales,
  iniciarSesion,
  registrarUsuario,
  solicitarRecuperacion,
} = require('../dist/services/auth.js');
const app = require('../dist/app.js').default;

function datos() {
  const usuarios = [
    {
      id: 1,
      nombre: 'Ana Pérez',
      email: 'admin@fitcore.com',
      perfil: 'Administración',
      activo: true,
    },
    {
      id: 13,
      nombre: 'Alumno Inactivo',
      email: 'inactivo@mail.com',
      perfil: 'Alumno',
      activo: false,
    },
    { id: 130, nombre: 'Profe', email: 'profe@fitcore.com', perfil: 'Profesor', activo: true },
  ];

  return { usuarios, credenciales: crearCredenciales(usuarios) };
}

function errorHttp(status, mensaje) {
  return (error) => {
    assert.equal(error.status, status);
    if (mensaje) assert.equal(error.message, mensaje);
    return true;
  };
}

// Login

test('login correcto devuelve token y usuario', () => {
  const { usuarios, credenciales } = datos();

  const sesion = iniciarSesion(usuarios, credenciales, {
    email: 'admin@fitcore.com',
    password: PASSWORD_DEMO,
  });

  assert.deepEqual(sesion.usuario, usuarios[0]);
  const payload = jwt.verify(sesion.token, 'clave-de-prueba');
  assert.equal(payload.sub, '1');
  assert.equal(payload.perfil, 'Administración');
  assert.equal(payload.exp - payload.iat, 8 * 60 * 60);
});

test('login no distingue mayúsculas en el email', () => {
  const { usuarios, credenciales } = datos();

  const sesion = iniciarSesion(usuarios, credenciales, {
    email: 'Admin@FitCore.com',
    password: PASSWORD_DEMO,
  });

  assert.equal(sesion.usuario.id, 1);
});

test('login con contraseña incorrecta o email inexistente da 401 con el mismo mensaje', () => {
  const { usuarios, credenciales } = datos();
  const mensaje = 'Email o contraseña incorrectos';

  assert.throws(
    () => iniciarSesion(usuarios, credenciales, { email: 'admin@fitcore.com', password: 'otra' }),
    errorHttp(401, mensaje),
  );
  assert.throws(
    () =>
      iniciarSesion(usuarios, credenciales, { email: 'nadie@mail.com', password: PASSWORD_DEMO }),
    errorHttp(401, mensaje),
  );
});

test('login de usuario inactivo da 401', () => {
  const { usuarios, credenciales } = datos();

  assert.throws(
    () =>
      iniciarSesion(usuarios, credenciales, {
        email: 'inactivo@mail.com',
        password: PASSWORD_DEMO,
      }),
    errorHttp(401),
  );
});

test('login sin email o sin contraseña da 400', () => {
  const { usuarios, credenciales } = datos();

  assert.throws(
    () => iniciarSesion(usuarios, credenciales, { password: PASSWORD_DEMO }),
    errorHttp(400),
  );
  assert.throws(
    () => iniciarSesion(usuarios, credenciales, { email: 'admin@fitcore.com' }),
    errorHttp(400),
  );
  assert.throws(() => iniciarSesion(usuarios, credenciales, null), errorHttp(400));
});

// Registro

test('registro crea un Alumno activo con el id siguiente y puede iniciar sesión', () => {
  const { usuarios, credenciales } = datos();

  const sesion = registrarUsuario(usuarios, credenciales, {
    nombre: 'Juan Gómez',
    email: 'juan@mail.com',
    password: 'clave1234',
  });

  assert.deepEqual(sesion.usuario, {
    id: 131,
    nombre: 'Juan Gómez',
    email: 'juan@mail.com',
    perfil: 'Alumno',
    activo: true,
  });
  assert.equal(jwt.verify(sesion.token, 'clave-de-prueba').sub, '131');
  assert.equal(usuarios.length, 4);
  assert.ok(!('password' in sesion.usuario));

  const login = iniciarSesion(usuarios, credenciales, {
    email: 'juan@mail.com',
    password: 'clave1234',
  });
  assert.equal(login.usuario.id, 131);
});

test('registro con email existente da 409', () => {
  const { usuarios, credenciales } = datos();

  assert.throws(
    () =>
      registrarUsuario(usuarios, credenciales, {
        nombre: 'Otra Ana',
        email: 'ADMIN@fitcore.com',
        password: 'clave1234',
      }),
    errorHttp(409),
  );
  assert.equal(usuarios.length, 3);
});

test('registro con datos inválidos da 400', () => {
  const { usuarios, credenciales } = datos();
  const valido = { nombre: 'Juan Gómez', email: 'juan@mail.com', password: 'clave1234' };

  for (const cambio of [
    { nombre: '' },
    { email: undefined },
    { email: 'no-es-un-email' },
    { password: undefined },
    { password: 'corta' },
  ]) {
    assert.throws(
      () => registrarUsuario(usuarios, credenciales, { ...valido, ...cambio }),
      errorHttp(400),
    );
  }
  assert.equal(usuarios.length, 3);
});

// Recuperación de contraseña

test('forgot-password responde lo mismo exista o no el email', () => {
  const mensaje =
    'Si el email está registrado, vas a recibir las instrucciones para recuperar la contraseña.';

  assert.deepEqual(solicitarRecuperacion({ email: 'admin@fitcore.com' }), { mensaje });
  assert.deepEqual(solicitarRecuperacion({ email: 'nadie@mail.com' }), { mensaje });
});

test('forgot-password con email vacío o inválido da 400', () => {
  assert.throws(() => solicitarRecuperacion({ email: '' }), errorHttp(400));
  assert.throws(() => solicitarRecuperacion({ email: 'no-es-un-email' }), errorHttp(400));
});

// Rutas HTTP

test('las rutas /api/v1/auth responden con el formato y los códigos del contrato', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/auth`;
  const post = (ruta, body) =>
    fetch(`${base}${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  try {
    let res = await post('/login', { email: 'admin@fitcore.com', password: PASSWORD_DEMO });
    let body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(typeof body.data.token, 'string');
    assert.equal(body.data.usuario.email, 'admin@fitcore.com');

    res = await post('/login', { email: 'admin@fitcore.com', password: 'otra' });
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: 'Email o contraseña incorrectos' });

    res = await post('/register', {
      nombre: 'Juan Gómez',
      email: 'juan.gomez@mail.com',
      password: 'clave1234',
    });
    body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.data.usuario.id, 131);

    res = await post('/forgot-password', { email: 'nadie@mail.com' });
    assert.equal(res.status, 200);
    assert.equal(typeof (await res.json()).data.mensaje, 'string');

    res = await post('/forgot-password', {});
    assert.equal(res.status, 400);
  } finally {
    servidor.close();
  }
});
