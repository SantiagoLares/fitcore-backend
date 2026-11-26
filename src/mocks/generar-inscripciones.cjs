const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const leer = (nombre) =>
  JSON.parse(
    fs.readFileSync(path.join(__dirname, nombre), "utf8")
      .replace(/^\uFEFF/, ""),
  );

const alumnos = leer("alumnos.json");
const clases = leer("clases.json");
const destino = path.join(__dirname, "inscripciones.json");

assert.ok(!fs.existsSync(destino), "inscripciones.json ya existe");
assert.ok(alumnos.length > 0, "No hay alumnos");
assert.ok(clases.length > 0, "No hay clases");

const activos = alumnos.filter((alumno) => alumno.estado === "activo");
const inscripciones = [];
const pares = new Set();

function fechaPara(alumno, indice) {
  const fechaAlta = new Date(`${alumno.fechaAlta}T00:00:00Z`);
  const fechaCorte = new Date("2026-11-26T00:00:00Z");

  assert.ok(
    Number.isFinite(fechaAlta.getTime()),
    `fechaAlta inválida para el alumno ${alumno.id}`,
  );

  assert.ok(
    fechaAlta <= fechaCorte,
    `El alumno ${alumno.id} tiene fechaAlta futura: ${alumno.fechaAlta}`,
  );

  const inicio = Math.max(
    fechaAlta.getTime(),
    Date.parse("2026-10-01T00:00:00Z"),
  );

  const diasDisponibles = Math.floor(
    (fechaCorte.getTime() - inicio) / 86400000,
  );

  const desplazamiento = indice % (diasDisponibles + 1);
  const fecha = new Date(inicio + desplazamiento * 86400000);

  return fecha.toISOString().slice(0, 10);
}

function agregar(alumno, clase, estado) {
  const par = `${alumno.id}:${clase.id}`;

  assert.ok(!pares.has(par), `Combinación duplicada: ${par}`);
  pares.add(par);

  inscripciones.push({
    id: inscripciones.length + 1,
    alumno: {
      id: alumno.id,
      nombre: alumno.nombre,
      apellido: alumno.apellido,
    },
    clase: {
      id: clase.id,
      nombre: clase.nombre,
    },
    fechaInscripcion: fechaPara(alumno, inscripciones.length),
    estado,
  });
}

// Conservamos los contadores existentes en el mock de Clases.
clases.forEach((clase, indiceClase) => {
  assert.ok(
    Number.isSafeInteger(clase.cuposOcupados) &&
      clase.cuposOcupados >= 0 &&
      clase.cuposOcupados <= clase.cupoMaximo,
    `Cupos inválidos en la clase ${clase.id}`,
  );

  assert.equal(
    clase.cuposDisponibles,
    clase.cupoMaximo - clase.cuposOcupados,
    `Cupos disponibles inconsistentes en clase ${clase.id}`,
  );

  assert.ok(
    clase.cuposOcupados <= activos.length,
    `Clase ${clase.id}: requiere ${clase.cuposOcupados} alumnos activos distintos, pero hay ${activos.length}`,
  );

  for (let i = 0; i < clase.cuposOcupados; i++) {
    const alumno = activos[(i + indiceClase) % activos.length];
    agregar(alumno, clase, "activa");
  }
});

// Sumamos cancelaciones para probar búsquedas y filtros por estado.
const objetivo = Math.max(30, inscripciones.length + 10);

for (const clase of clases) {
  for (const alumno of alumnos) {
    if (inscripciones.length >= objetivo) break;

    if (!pares.has(`${alumno.id}:${clase.id}`)) {
      agregar(alumno, clase, "cancelada");
    }
  }

  if (inscripciones.length >= objetivo) break;
}

assert.ok(inscripciones.length >= 30, "No se alcanzaron 30 registros");
assert.equal(
  new Set(inscripciones.map((item) => item.id)).size,
  inscripciones.length,
  "Hay IDs duplicados",
);

for (const clase of clases) {
  const cantidadActivas = inscripciones.filter(
    (item) => item.clase.id === clase.id && item.estado === "activa",
  ).length;

  assert.equal(
    cantidadActivas,
    clase.cuposOcupados,
    `Inscripciones inconsistentes en clase ${clase.id}`,
  );
}

fs.writeFileSync(
  destino,
  JSON.stringify(inscripciones, null, 2) + "\n",
  { encoding: "utf8", flag: "wx" },
);

const cantidadActivas = inscripciones.filter(
  (item) => item.estado === "activa",
).length;

console.log(
  `OK: ${inscripciones.length} inscripciones; ` +
  `${cantidadActivas} activas y ` +
  `${inscripciones.length - cantidadActivas} canceladas. ` +
  "Sin pares duplicados y con cupos coherentes.",
);