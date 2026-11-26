const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { listarProfesores, obtenerProfesorPorId, crearProfesor } = require('../dist/services/profesores.js');

const profesores = JSON.parse(fs.readFileSync('src/mocks/profesores.json', 'utf8'));

const usuarios = JSON.parse(
  fs.readFileSync('src/mocks/usuarios.json', 'utf8'),
);

const clases = JSON.parse(fs.readFileSync('src/mocks/clases.json', 'utf8'));

test('pagina y ordena por apellido ascendente por defecto', () => {
  const result = listarProfesores(profesores, {
    page: '1',
    limit: '5',
  });

  assert.equal(result.data.length, 5);
  assert.deepEqual(result.meta, {
    page: 1,
    limit: 5,
    total: 30,
    totalPages: 6,
  });

  assert.deepEqual(
    result.data.map((profesor) => profesor.apellido),
    [...result.data.map((profesor) => profesor.apellido)].sort((a, b) => a.localeCompare(b, 'es')),
  );
});

test('ordena por nombre descendente', () => {
  const result = listarProfesores(profesores, {
    sortBy: 'nombre',
    order: 'desc',
  });

  assert.deepEqual(
    result.data.map((profesor) => profesor.nombre),
    [...result.data.map((profesor) => profesor.nombre)].sort((a, b) => b.localeCompare(a, 'es')),
  );
});

test('busca por apellido, nombre o DNI', () => {
  const profesor = profesores[0];

  for (const search of [profesor.apellido, profesor.nombre, profesor.dni]) {
    const result = listarProfesores(profesores, { search });

    assert.ok(result.data.some((item) => item.id === profesor.id));
  }
});

test('busca sin distinguir mayúsculas ni tildes', () => {
  const campos = profesores.flatMap((profesor) => [
    { id: profesor.id, valor: profesor.nombre },
    { id: profesor.id, valor: profesor.apellido },
  ]);

  const campo = campos.find((item) => /[áéíóú]/i.test(item.valor));

  assert.ok(campo, 'Debe existir un nombre o apellido con tilde');

  const busqueda = campo.valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const result = listarProfesores(profesores, {
    search: busqueda,
    limit: '100',
  });

  assert.ok(result.data.some((item) => item.id === campo.id));
});

test('filtra por especialidad', () => {
  const especialidad = profesores[0].especialidad;

  const result = listarProfesores(profesores, {
    especialidad,
  });

  assert.ok(result.data.length > 0);
  assert.ok(result.data.every((profesor) => profesor.especialidad === especialidad));
});

test('combina búsqueda y filtro por especialidad', () => {
  const profesor = profesores[0];

  const result = listarProfesores(profesores, {
    search: profesor.apellido,
    especialidad: profesor.especialidad,
  });

  assert.ok(result.data.some((item) => item.id === profesor.id));

  assert.ok(result.data.every((item) => item.especialidad === profesor.especialidad));
});

test('devuelve una lista vacía cuando no hay coincidencias', () => {
  const result = listarProfesores(profesores, {
    search: 'profesorinexistente',
  });

  assert.deepEqual(result.data, []);
  assert.equal(result.meta.total, 0);
});

test('rechaza parámetros inválidos con HTTP 400', () => {
  for (const query of [
    { page: 'abc' },
    { sortBy: 'password' },
    { order: 'otro' },
    { search: ['Juan', 'Pedro'] },
    { especialidad: ['Yoga', 'Pilates'] },
  ]) {
    assert.throws(() => listarProfesores(profesores, query), { status: 400 });
  }
});

test('devuelve el detalle de un profesor con sus clases', () => {
  const profesor = profesores.find((item) => clases.some((clase) => clase.profesor.id === item.id));

  assert.ok(profesor, 'Debe existir un profesor con clases asignadas');

  const result = obtenerProfesorPorId(profesores, clases, String(profesor.id));

  const clasesEsperadas = clases
    .filter((clase) => clase.profesor.id === profesor.id)
    .map((clase) => ({
      id: clase.id,
      nombre: clase.nombre,
    }));

  assert.deepEqual(result, {
    ...profesor,
    clases: clasesEsperadas,
  });
});

test('devuelve un array vacío si el profesor no tiene clases', () => {
  const profesor = profesores[0];

  const result = obtenerProfesorPorId(profesores, [], String(profesor.id));

  assert.deepEqual(result, {
    ...profesor,
    clases: [],
  });
});

test('devuelve HTTP 404 si el profesor no existe', () => {
  const idInexistente = Math.max(...profesores.map((profesor) => profesor.id)) + 1;

  assert.throws(() => obtenerProfesorPorId(profesores, clases, String(idInexistente)), {
    status: 404,
  });
});

test('rechaza IDs inválidos con HTTP 400', () => {
  for (const id of ['abc', '0', '-1', '1.5', '', '1e2', '9007199254740992']) {
    assert.throws(() => obtenerProfesorPorId(profesores, clases, id), { status: 400 });
  }
});

// TUP-41: Alta de profesores

const usuarioNuevo = {
  id: 999,
  nombre: 'Martín López',
  email: 'martin@example.com',
  perfil: 'Profesor',
  activo: true,
};

const profesorNuevo = {
  usuarioId: 999,
  dni: '99999999',
  nombre: 'Martín',
  apellido: 'López',
  email: 'martin@example.com',
  telefono: '2915559876',
  especialidad: 'Funcional',
};

function prepararAltaProfesor() {
  return {
    profesores: structuredClone(profesores),
    usuarios: [...structuredClone(usuarios), { ...usuarioNuevo }],
    datos: { ...profesorNuevo },
  };
}

test('crea un profesor con un ID generado y lo almacena', () => {
  const contexto = prepararAltaProfesor();

  const idEsperado =
    Math.max(...contexto.profesores.map((profesor) => profesor.id)) + 1;

  const cantidadInicial = contexto.profesores.length;

  const resultado = crearProfesor(
    contexto.profesores,
    contexto.usuarios,
    contexto.datos,
  );

  assert.deepEqual(resultado, {
    id: idEsperado,
    ...contexto.datos,
  });

  assert.equal(contexto.profesores.length, cantidadInicial + 1);
  assert.deepEqual(contexto.profesores.at(-1), resultado);
});

test('rechaza campos obligatorios ausentes sin guardar datos', () => {
  const campos = [
    'usuarioId',
    'dni',
    'nombre',
    'apellido',
    'email',
    'especialidad',
  ];

  for (const campo of campos) {
    const contexto = prepararAltaProfesor();

    delete contexto.datos[campo];

    assert.throws(
      () =>
        crearProfesor(
          contexto.profesores,
          contexto.usuarios,
          contexto.datos,
        ),
      { status: 400 },
    );

    assert.deepEqual(contexto.profesores, profesores);
  }
});

test('rechaza datos inválidos sin guardar el profesor', () => {
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

  for (const cambios of casos) {
    const contexto = prepararAltaProfesor();

    assert.throws(
      () =>
        crearProfesor(
          contexto.profesores,
          contexto.usuarios,
          { ...contexto.datos, ...cambios },
        ),
      { status: 400 },
    );

    assert.deepEqual(contexto.profesores, profesores);
  }
});

test('rechaza crear un profesor con un usuario inexistente', () => {
  const contexto = prepararAltaProfesor();

  contexto.datos.usuarioId = 9999;

  assert.throws(
    () =>
      crearProfesor(
        contexto.profesores,
        contexto.usuarios,
        contexto.datos,
      ),
    { status: 400 },
  );

  assert.deepEqual(contexto.profesores, profesores);
});

test('rechaza un usuario cuyo perfil no es Profesor', () => {
  const contexto = prepararAltaProfesor();

  for (const perfil of ['Alumno', 'Administración']) {
    const usuario = contexto.usuarios.find(
      (item) => item.perfil === perfil,
    );

    assert.ok(usuario);

    contexto.datos.usuarioId = usuario.id;

    assert.throws(
      () =>
        crearProfesor(
          contexto.profesores,
          contexto.usuarios,
          contexto.datos,
        ),
      { status: 400 },
    );

    assert.deepEqual(contexto.profesores, profesores);
  }
});

test('rechaza crear un profesor con un DNI duplicado', () => {
  const contexto = prepararAltaProfesor();

  contexto.datos.dni = contexto.profesores[0].dni;

  assert.throws(
    () =>
      crearProfesor(
        contexto.profesores,
        contexto.usuarios,
        contexto.datos,
      ),
    { status: 409 },
  );

  assert.deepEqual(contexto.profesores, profesores);
});

test('rechaza un usuario que ya tiene un profesor asociado', () => {
  const contexto = prepararAltaProfesor();

  contexto.datos.usuarioId = contexto.profesores[0].usuarioId;

  assert.throws(
    () =>
      crearProfesor(
        contexto.profesores,
        contexto.usuarios,
        contexto.datos,
      ),
    { status: 409 },
  );

  assert.deepEqual(contexto.profesores, profesores);
});
