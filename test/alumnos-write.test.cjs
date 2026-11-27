const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { crearAlumno, modificarAlumno, eliminarAlumno } = require('../dist/services/alumnos.js');

const alumnosMock = JSON.parse(fs.readFileSync('src/mocks/alumnos.json', 'utf8'));
const usuariosMock = JSON.parse(fs.readFileSync('src/mocks/usuarios.json', 'utf8'));

// Fecha fija para que fechaAlta no cambie con el paso del tiempo.
const HOY = '2026-11-26';

// Usuario con perfil Alumno que todavía no tiene un alumno asociado.
const usuarioLibre = { id: 131, nombre: 'Juan Gómez', email: 'juan@mail.com', perfil: 'Alumno', activo: true };

function datos() {
    return structuredClone(alumnosMock);
}

function usuarios() {
    return [...structuredClone(usuariosMock), { ...usuarioLibre }];
}

function cuerpoValido() {
    return {
        usuarioId: 131,
        dni: '40123456',
        nombre: 'Juan',
        apellido: 'Gómez',
        email: 'juan@mail.com',
        telefono: '2915551234',
    };
}

test('crea un alumno con el id siguiente, fecha de hoy y estado activo, y lo guarda', () => {
    const alumnos = datos();
    const alumno = crearAlumno(alumnos, usuarios(), cuerpoValido(), HOY);

    assert.deepEqual(alumno, {
        id: 33,
        usuarioId: 131,
        dni: '40123456',
        nombre: 'Juan',
        apellido: 'Gómez',
        email: 'juan@mail.com',
        telefono: '2915551234',
        fechaAlta: HOY,
        estado: 'activo',
    });
    assert.equal(alumnos.length, 33);
    assert.deepEqual(alumnos.at(-1), alumno);
});

test('ignora id, fechaAlta y estado si vienen en el cuerpo', () => {
    const alumno = crearAlumno(
        datos(),
        usuarios(),
        { ...cuerpoValido(), id: 999, fechaAlta: '2000-01-01', estado: 'baja' },
        HOY,
    );

    assert.equal(alumno.id, 33);
    assert.equal(alumno.fechaAlta, HOY);
    assert.equal(alumno.estado, 'activo');
});

test('el teléfono es opcional y queda vacío si no se envía', () => {
    const { telefono, ...sinTelefono } = cuerpoValido();
    const alumno = crearAlumno(datos(), usuarios(), sinTelefono, HOY);

    assert.equal(telefono, '2915551234');
    assert.equal(alumno.telefono, '');
});

test('rechaza campos obligatorios ausentes con 400 sin guardar datos', () => {
    for (const campo of ['usuarioId', 'dni', 'nombre', 'apellido', 'email']) {
        const alumnos = datos();
        const cuerpo = cuerpoValido();

        delete cuerpo[campo];

        assert.throws(() => crearAlumno(alumnos, usuarios(), cuerpo, HOY), { status: 400 });
        assert.equal(alumnos.length, 32);
    }
});

test('rechaza cuerpos que no son un objeto con 400', () => {
    for (const cuerpo of [undefined, null, [], 'texto', 5]) {
        assert.throws(() => crearAlumno(datos(), usuarios(), cuerpo, HOY), { status: 400 });
    }
});

test('rechaza datos inválidos con 400 sin guardar datos', () => {
    for (const cambio of [
        { usuarioId: '131' },
        { usuarioId: 0 },
        { usuarioId: 1.5 },
        { dni: '   ' },
        { dni: 40123456 },
        { nombre: '' },
        { apellido: null },
        { email: 'no-es-un-email' },
        { telefono: 2915551234 },
    ]) {
        const alumnos = datos();

        assert.throws(() => crearAlumno(alumnos, usuarios(), { ...cuerpoValido(), ...cambio }, HOY), {
            status: 400,
        });
        assert.equal(alumnos.length, 32);
    }
});

test('rechaza un usuario inexistente o con un perfil distinto de Alumno con 400', () => {
    // 9999 no existe, 101 es Profesor y 1 es Administración.
    for (const usuarioId of [9999, 101, 1]) {
        assert.throws(() => crearAlumno(datos(), usuarios(), { ...cuerpoValido(), usuarioId }, HOY), {
            status: 400,
            code: 'INVALID_USER',
        });
    }
});

test('rechaza un DNI duplicado con 409', () => {
    assert.throws(
        () => crearAlumno(datos(), usuarios(), { ...cuerpoValido(), dni: '43396013' }, HOY),
        { status: 409, code: 'DUPLICATE_DNI' },
    );
});

test('rechaza un usuario que ya tiene un alumno asociado con 409', () => {
    // El usuario 11 ya está asociado al alumno 1.
    assert.throws(
        () => crearAlumno(datos(), usuarios(), { ...cuerpoValido(), usuarioId: 11 }, HOY),
        { status: 409, code: 'DUPLICATE_USER' },
    );
});

test('modifica un alumno conservando su id y su fecha de alta', () => {
    const alumnos = datos();
    const alumno = modificarAlumno(
        alumnos,
        usuarios(),
        '1',
        { ...cuerpoValido(), usuarioId: 11, dni: '43396013', nombre: 'Lucía María', estado: 'activo' },
    );

    assert.equal(alumno.id, 1);
    assert.equal(alumno.nombre, 'Lucía María');
    assert.equal(alumno.fechaAlta, '2024-03-04');
    assert.deepEqual(alumnos[0], alumno);
    assert.equal(alumnos.length, 32);
});

test('permite reactivar a un alumno dado de baja', () => {
    const alumnos = datos();
    const baja = alumnos.find((alumno) => alumno.estado === 'baja');

    const alumno = modificarAlumno(alumnos, usuarios(), String(baja.id), {
        usuarioId: baja.usuarioId,
        dni: baja.dni,
        nombre: baja.nombre,
        apellido: baja.apellido,
        email: baja.email,
        telefono: baja.telefono,
        estado: 'activo',
    });

    assert.equal(alumno.estado, 'activo');
});

test('modificar rechaza un ID inválido con 400 y uno inexistente con 404', () => {
    const cuerpo = { ...cuerpoValido(), estado: 'activo' };

    for (const id of ['abc', '0', '-1', '1.5']) {
        assert.throws(() => modificarAlumno(datos(), usuarios(), id, cuerpo), {
            status: 400,
            code: 'INVALID_ID',
        });
    }

    assert.throws(() => modificarAlumno(datos(), usuarios(), '999999', cuerpo), {
        status: 404,
        code: 'ALUMNO_NOT_FOUND',
    });
});

test('modificar rechaza campos ausentes o inválidos con 400 sin modificar', () => {
    for (const cambio of [
        { estado: undefined },
        { estado: 'otro' },
        { dni: undefined },
        { email: 'no-es-un-email' },
        { usuarioId: 9999 },
    ]) {
        const alumnos = datos();

        assert.throws(
            () => modificarAlumno(alumnos, usuarios(), '1', { ...cuerpoValido(), usuarioId: 11, estado: 'activo', ...cambio }),
            { status: 400 },
        );
        assert.deepEqual(alumnos, alumnosMock);
    }
});

test('modificar rechaza el DNI o el usuario de otro alumno con 409 sin modificar', () => {
    const base = { ...cuerpoValido(), estado: 'activo' };

    for (const [cambio, code] of [
        [{ usuarioId: 11, dni: '42321969' }, 'DUPLICATE_DNI'],
        [{ usuarioId: 12, dni: '40123456' }, 'DUPLICATE_USER'],
    ]) {
        const alumnos = datos();

        assert.throws(() => modificarAlumno(alumnos, usuarios(), '1', { ...base, ...cambio }), {
            status: 409,
            code,
        });
        assert.deepEqual(alumnos, alumnosMock);
    }
});

test('eliminar hace una baja lógica: conserva el registro y pasa a estado baja', () => {
    const alumnos = datos();

    const resultado = eliminarAlumno(alumnos, '1');

    assert.equal(resultado, undefined);
    assert.equal(alumnos.length, 32);
    assert.deepEqual(alumnos[0], { ...alumnosMock[0], estado: 'baja' });
});

test('eliminar un alumno que ya está de baja no da error', () => {
    const alumnos = datos();

    eliminarAlumno(alumnos, '1');
    eliminarAlumno(alumnos, '1');

    assert.equal(alumnos[0].estado, 'baja');
});

test('eliminar rechaza un ID inválido con 400 y uno inexistente con 404', () => {
    for (const id of ['abc', '0', '-1', '1.5']) {
        assert.throws(() => eliminarAlumno(datos(), id), { status: 400, code: 'INVALID_ID' });
    }

    assert.throws(() => eliminarAlumno(datos(), '999999'), { status: 404, code: 'ALUMNO_NOT_FOUND' });
});