process.env.JWT_SECRET = 'clave-de-prueba';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const usuariosMock = require('../dist/mocks/usuarios.json');

usuariosMock.push({
  id: 999,
  nombre: 'Martín López',
  email: 'martin@example.com',
  perfil: 'Profesor',
  activo: true,
});

const app = require('../dist/app.js').default;

const profesores = JSON.parse(fs.readFileSync('src/mocks/profesores.json', 'utf8'));
const clases = JSON.parse(fs.readFileSync('src/mocks/clases.json', 'utf8'));

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

test('GET /api/v1/profesores/:id devuelve el detalle del profesor', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/profesores`;

  try {
    const profesor = profesores.find((item) =>
      clases.some((clase) => clase.profesor.id === item.id),
    );

    assert.ok(profesor, 'Debe existir un profesor con clases asignadas');

    const res = await fetch(`${base}/${profesor.id}`);
    const body = await res.json();

    const clasesEsperadas = clases
      .filter((clase) => clase.profesor.id === profesor.id)
      .map((clase) => ({
        id: clase.id,
        nombre: clase.nombre,
      }));

    assert.equal(res.status, 200);
    assert.deepEqual(body.data, {
      ...profesor,
      clases: clasesEsperadas,
    });
  } finally {
    servidor.close();
  }
});

test('GET /api/v1/profesores/:id devuelve 404 si no existe', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/profesores`;

  try {
    const idInexistente = Math.max(...profesores.map((profesor) => profesor.id)) + 1;

    const res = await fetch(`${base}/${idInexistente}`);
    const body = await res.json();

    assert.equal(res.status, 404);
    assert.equal(body.error, 'Profesor no encontrado');
  } finally {
    servidor.close();
  }
});

test('GET /api/v1/profesores/:id rechaza IDs inválidos', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/profesores`;

  try {
    for (const id of ['abc', '0', '-1', '1.5', '1e2', '9007199254740992']) {
      const res = await fetch(`${base}/${id}`);
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.error, 'El ID debe ser un entero positivo');
    }
  } finally {
    servidor.close();
  }
});

const profesorNuevo = {
  usuarioId: 999,
  dni: '99999999',
  nombre: 'Martín',
  apellido: 'López',
  email: 'martin@example.com',
  telefono: '2915559876',
  especialidad: 'Funcional',
};

test('POST /api/v1/profesores crea un profesor correctamente', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/profesores`;

  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profesorNuevo),
    });

    const body = await res.json();

    assert.equal(res.status, 201);

    const idEsperado = Math.max(...profesores.map((profesor) => profesor.id)) + 1;

    assert.deepEqual(body.data, {
      id: idEsperado,
      ...profesorNuevo,
    });

    assert.equal(res.headers.get('location'), `/api/v1/profesores/${idEsperado}`);

    // Comprobar que el profesor quedó almacenado.
    const resDetalle = await fetch(`${base}/${idEsperado}`);
    const detalle = await resDetalle.json();

    assert.equal(resDetalle.status, 200);
    assert.deepEqual(detalle.data, {
      id: idEsperado,
      ...profesorNuevo,
      clases: [],
    });
  } finally {
    servidor.close();
  }
});

test('POST /api/v1/profesores rechaza campos obligatorios ausentes', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/profesores`;

  try {
    const campos = ['usuarioId', 'dni', 'nombre', 'apellido', 'email', 'especialidad'];

    for (const campo of campos) {
      const datos = { ...profesorNuevo };
      delete datos[campo];

      const res = await fetch(base, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos),
      });

      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(typeof body.error, 'string');
    }
  } finally {
    servidor.close();
  }
});

test('POST /api/v1/profesores rechaza datos inválidos', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/profesores`;

  try {
    const casos = [
      { usuarioId: 0 },
      { usuarioId: '999' },
      { dni: '' },
      { nombre: '   ' },
      { apellido: '' },
      { email: 'correo-invalido' },
      { especialidad: '' },
      { telefono: 123456 },
    ];

    for (const caso of casos) {
      const res = await fetch(base, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profesorNuevo,
          ...caso,
        }),
      });

      assert.equal(res.status, 400);
    }
  } finally {
    servidor.close();
  }
});

test('POST /api/v1/profesores rechaza un usuario inexistente', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/profesores`;

  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...profesorNuevo,
        usuarioId: 9999,
      }),
    });

    assert.equal(res.status, 400);
  } finally {
    servidor.close();
  }
});

test('POST /api/v1/profesores rechaza usuarios que no son profesores', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/profesores`;

  try {
    for (const perfil of ['Alumno', 'Administración']) {
      const usuario = usuariosMock.find((item) => item.perfil === perfil);

      assert.ok(usuario);

      const res = await fetch(base, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profesorNuevo,
          usuarioId: usuario.id,
        }),
      });

      assert.equal(res.status, 400);
    }
  } finally {
    servidor.close();
  }
});

test('POST /api/v1/profesores rechaza un DNI duplicado', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/profesores`;

  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...profesorNuevo,
        dni: profesores[0].dni,
      }),
    });

    assert.equal(res.status, 409);

    const body = await res.json();
    assert.equal(body.error, 'El DNI ya está registrado');
  } finally {
    servidor.close();
  }
});

test('POST /api/v1/profesores rechaza un usuario ya asociado', async () => {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/profesores`;

  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...profesorNuevo,
        usuarioId: profesores[0].usuarioId,
        dni: '99999998',
      }),
    });

    assert.equal(res.status, 409);

    const body = await res.json();
    assert.equal(body.error, 'El usuario ya tiene un profesor asociado');
  } finally {
    servidor.close();
  }
});
