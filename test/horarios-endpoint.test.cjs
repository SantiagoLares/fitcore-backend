process.env.JWT_SECRET = 'clave-de-prueba';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../dist/app.js').default;

const horarios = require('../dist/mocks/horarios.json');
const clases = require('../dist/mocks/clases.json');

const token = (id) =>
  jwt.sign({}, 'clave-de-prueba', {
    subject: String(id),
    expiresIn: '1h',
  });

async function probarEndpoint(callback) {
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}/api/v1/horarios`;

  const pedir = (query = '', usuarioId, opciones = {}) =>
    fetch(`${base}${query}`, {
      method: opciones.method ?? 'GET',
      headers: {
        ...(usuarioId === undefined ? {} : { Authorization: `Bearer ${token(usuarioId)}` }),
        ...(opciones.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
    });

  try {
    await callback(pedir);
  } finally {
    servidor.close();
  }
}

test('GET /horarios rechaza el acceso sin autenticación', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir();

    assert.equal(res.status, 401);
  });
});

test('GET /horarios devuelve el listado para Administración', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir('', 1);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.data.length, 10);

    assert.deepEqual(body.meta, {
      page: 1,
      limit: 10,
      total: horarios.length,
      totalPages: Math.ceil(horarios.length / 10),
    });
  });
});

test('GET /horarios respeta la paginación y el ordenamiento', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir('?page=2&limit=5&sortBy=id&order=desc', 1);

    const body = await res.json();

    const esperados = [...horarios].sort((a, b) => b.id - a.id).slice(5, 10);

    assert.equal(res.status, 200);
    assert.deepEqual(body.data, esperados);

    assert.deepEqual(body.meta, {
      page: 2,
      limit: 5,
      total: horarios.length,
      totalPages: Math.ceil(horarios.length / 5),
    });
  });
});

test('GET /horarios permite combinar los filtros', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir('?claseId=1&diaSemana=lunes&profesorId=1', 1);

    const body = await res.json();

    const esperados = horarios.filter((h) => h.claseId === 1 && h.diaSemana === 'lunes');

    assert.equal(res.status, 200);
    assert.ok(esperados.length > 0);
    assert.deepEqual(body.data, esperados);
    assert.equal(body.meta.total, esperados.length);
  });
});

test('GET /horarios permite consultar el listado a un Alumno', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir('?limit=100', 11);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.meta.total, horarios.length);
    assert.equal(body.data.length, horarios.length);
  });
});

test('GET /horarios restringe al Profesor a sus propias clases', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir('?limit=100&sortBy=id', 101);
    const body = await res.json();

    const clasesPermitidas = new Set(clases.filter((c) => c.profesor.id === 1).map((c) => c.id));

    const esperados = horarios
      .filter((h) => clasesPermitidas.has(h.claseId))
      .sort((a, b) => a.id - b.id);

    assert.equal(res.status, 200);
    assert.ok(esperados.length > 0);
    assert.deepEqual(body.data, esperados);
    assert.equal(body.meta.total, esperados.length);
  });
});

test('GET /horarios impide al Profesor consultar horarios ajenos', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir('?profesorId=2', 101);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.deepEqual(body.data, []);
    assert.equal(body.meta.total, 0);
  });
});

test('GET /horarios rechaza usuarios inactivos', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir('', 13);

    assert.equal(res.status, 401);
  });
});

test('GET /horarios rechaza parámetros inválidos', async () => {
  await probarEndpoint(async (pedir) => {
    for (const query of [
      '?page=0',
      '?limit=101',
      '?sortBy=password',
      '?order=otro',
      '?claseId=abc',
      '?profesorId=-1',
      '?diaSemana=feriado',
    ]) {
      const res = await pedir(query, 1);

      assert.equal(res.status, 400, query);
    }
  });
});

test('GET /horarios/:id devuelve todos los atributos del horario', async () => {
  await probarEndpoint(async (pedir) => {
    const esperado = horarios[0];

    const res = await pedir(`/${esperado.id}`, 1);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.deepEqual(body, esperado);
  });
});

test('GET /horarios/:id devuelve 404 si no existe', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir('/999999', 1);
    const body = await res.json();

    assert.equal(res.status, 404);
    assert.equal(body.error, 'Horario no encontrado');
  });
});

test('GET /horarios/:id rechaza IDs inválidos', async () => {
  await probarEndpoint(async (pedir) => {
    for (const id of ['abc', '0', '-1', '1.5', '1abc']) {
      const res = await pedir(`/${id}`, 1);

      assert.equal(res.status, 400);
    }
  });
});

test('GET /horarios/:id rechaza el acceso sin autenticación', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir('/1');

    assert.equal(res.status, 401);
  });
});

test('GET /horarios/:id permite el acceso a un Alumno', async () => {
  await probarEndpoint(async (pedir) => {
    const esperado = horarios[0];

    const res = await pedir(`/${esperado.id}`, 11);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.deepEqual(body, esperado);
  });
});

test('GET /horarios/:id permite al Profesor consultar un horario propio', async () => {
  await probarEndpoint(async (pedir) => {
    const clasesPropias = new Set(clases.filter((c) => c.profesor.id === 1).map((c) => c.id));

    const esperado = horarios.find((h) => clasesPropias.has(h.claseId));

    assert.ok(esperado);

    const res = await pedir(`/${esperado.id}`, 101);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.deepEqual(body, esperado);
  });
});

test('GET /horarios/:id impide al Profesor consultar un horario ajeno', async () => {
  await probarEndpoint(async (pedir) => {
    const clasesAjenas = new Set(clases.filter((c) => c.profesor.id !== 1).map((c) => c.id));

    const horarioAjeno = horarios.find((h) => clasesAjenas.has(h.claseId));

    assert.ok(horarioAjeno);

    const res = await pedir(`/${horarioAjeno.id}`, 101);

    assert.equal(res.status, 403);
  });
});

test('GET /horarios/:id rechaza usuarios inactivos', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir('/1', 13);

    assert.equal(res.status, 401);
  });
});

const nuevoHorario = {
  claseId: 1,
  diaSemana: 'sabado',
  horaInicio: '17:00',
  horaFin: '18:00',
};

test('POST /horarios crea un horario y devuelve 201', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir('', 1, {
      method: 'POST',
      body: nuevoHorario,
    });

    assert.equal(res.status, 201);

    const body = await res.json();

    try {
      assert.ok(Number.isInteger(body.id));

      assert.deepEqual(body, {
        id: body.id,
        ...nuevoHorario,
      });

      const consulta = await pedir(`/${body.id}`, 1);

      assert.equal(consulta.status, 200);
      assert.deepEqual(await consulta.json(), body);
    } finally {
      await pedir(`/${body.id}`, 1, {
        method: 'DELETE',
      });
    }
  });
});

test('POST /horarios rechaza campos obligatorios ausentes', async () => {
  await probarEndpoint(async (pedir) => {
    for (const campo of Object.keys(nuevoHorario)) {
      const entrada = { ...nuevoHorario };
      delete entrada[campo];

      const res = await pedir('', 1, {
        method: 'POST',
        body: entrada,
      });

      assert.equal(res.status, 400, campo);
    }
  });
});

test('POST /horarios rechaza datos inválidos', async () => {
  await probarEndpoint(async (pedir) => {
    for (const datos of [
      { claseId: 999999 },
      { diaSemana: 'feriado' },
      { horaInicio: '25:00' },
      { horaFin: '16:00' },
    ]) {
      const res = await pedir('', 1, {
        method: 'POST',
        body: {
          ...nuevoHorario,
          ...datos,
        },
      });

      assert.equal(res.status, 400);
    }
  });
});

test('PUT /horarios/:id modifica un horario y devuelve 200', async () => {
  await probarEndpoint(async (pedir) => {
    const creacion = await pedir('', 1, {
      method: 'POST',
      body: nuevoHorario,
    });

    assert.equal(creacion.status, 201);

    const creado = await creacion.json();

    try {
      const res = await pedir(`/${creado.id}`, 1, {
        method: 'PUT',
        body: {
          diaSemana: 'domingo',
          horaInicio: '10:00',
          horaFin: '11:00',
        },
      });

      assert.equal(res.status, 200);

      const esperado = {
        id: creado.id,
        claseId: creado.claseId,
        diaSemana: 'domingo',
        horaInicio: '10:00',
        horaFin: '11:00',
      };

      assert.deepEqual(await res.json(), esperado);

      const consulta = await pedir(`/${creado.id}`, 1);

      assert.equal(consulta.status, 200);
      assert.deepEqual(await consulta.json(), esperado);
    } finally {
      await pedir(`/${creado.id}`, 1, {
        method: 'DELETE',
      });
    }
  });
});

test('PUT /horarios/:id rechaza campos ausentes y datos inválidos', async () => {
  await probarEndpoint(async (pedir) => {
    const original = horarios[0];

    for (const datos of [
      {},
      { diaSemana: 'lunes' },
      { ...original, diaSemana: 'feriado' },
      { ...original, horaFin: '00:00' },
      { ...original, claseId: original.claseId + 1 },
    ]) {
      const res = await pedir(`/${original.id}`, 1, {
        method: 'PUT',
        body: datos,
      });

      assert.equal(res.status, 400);
    }

    const consulta = await pedir(`/${original.id}`, 1);

    assert.deepEqual(await consulta.json(), original);
  });
});

test('PUT /horarios/:id devuelve 404 si no existe', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir('/999999', 1, {
      method: 'PUT',
      body: nuevoHorario,
    });

    assert.equal(res.status, 404);
  });
});

test('DELETE /horarios/:id elimina el horario y devuelve 204', async () => {
  await probarEndpoint(async (pedir) => {
    const creacion = await pedir('', 1, {
      method: 'POST',
      body: nuevoHorario,
    });

    assert.equal(creacion.status, 201);

    const creado = await creacion.json();

    const res = await pedir(`/${creado.id}`, 1, {
      method: 'DELETE',
    });

    assert.equal(res.status, 204);
    assert.equal(await res.text(), '');

    const consulta = await pedir(`/${creado.id}`, 1);

    assert.equal(consulta.status, 404);
  });
});

test('DELETE /horarios/:id impide eliminar el último horario de una clase', async () => {
  await probarEndpoint(async (pedir) => {
    const ultimo = horarios.find(
      (h) => horarios.filter((otro) => otro.claseId === h.claseId).length === 1,
    );

    assert.ok(ultimo, 'Debe existir una clase con un solo horario');

    const res = await pedir(`/${ultimo.id}`, 1, {
      method: 'DELETE',
    });

    assert.equal(res.status, 409);

    const consulta = await pedir(`/${ultimo.id}`, 1);

    assert.equal(consulta.status, 200);
    assert.deepEqual(await consulta.json(), ultimo);
  });
});

test('DELETE /horarios/:id devuelve 404 si no existe', async () => {
  await probarEndpoint(async (pedir) => {
    const res = await pedir('/999999', 1, {
      method: 'DELETE',
    });

    assert.equal(res.status, 404);
  });
});

test('PUT y DELETE rechazan IDs inválidos', async () => {
  await probarEndpoint(async (pedir) => {
    for (const id of ['abc', '0', '-1', '1.5']) {
      const modificar = await pedir(`/${id}`, 1, {
        method: 'PUT',
        body: nuevoHorario,
      });

      const eliminar = await pedir(`/${id}`, 1, {
        method: 'DELETE',
      });

      assert.equal(modificar.status, 400);
      assert.equal(eliminar.status, 400);
    }
  });
});

test('el ABM rechaza peticiones sin autenticación', async () => {
  await probarEndpoint(async (pedir) => {
    const alta = await pedir('', undefined, {
      method: 'POST',
      body: nuevoHorario,
    });

    const modificacion = await pedir('/1', undefined, {
      method: 'PUT',
      body: nuevoHorario,
    });

    const baja = await pedir('/1', undefined, {
      method: 'DELETE',
    });

    assert.equal(alta.status, 401);
    assert.equal(modificacion.status, 401);
    assert.equal(baja.status, 401);
  });
});

test('el ABM rechaza operaciones de profesores y alumnos', async () => {
  await probarEndpoint(async (pedir) => {
    for (const usuarioId of [101, 11]) {
      const alta = await pedir('', usuarioId, {
        method: 'POST',
        body: nuevoHorario,
      });

      const modificacion = await pedir('/1', usuarioId, {
        method: 'PUT',
        body: nuevoHorario,
      });

      const baja = await pedir('/1', usuarioId, {
        method: 'DELETE',
      });

      assert.equal(alta.status, 403);
      assert.equal(modificacion.status, 403);
      assert.equal(baja.status, 403);
    }
  });
});
