
const fs = require("node:fs");
const assert = require("node:assert/strict");

const actividades = [
  {
    tipo: "Funcional",
    profesor: { id: 1, nombre: "Martín", apellido: "López" },
    cupoMaximo: 20,
  },
  {
    tipo: "Yoga",
    profesor: { id: 2, nombre: "Lucía", apellido: "Fernández" },
    cupoMaximo: 16,
  },
  {
    tipo: "Spinning",
    profesor: { id: 3, nombre: "Diego", apellido: "Pérez" },
    cupoMaximo: 18,
  },
  {
    tipo: "Pilates",
    profesor: { id: 4, nombre: "Carolina", apellido: "Gómez" },
    cupoMaximo: 12,
  },
  {
    tipo: "Boxeo recreativo",
    profesor: { id: 5, nombre: "Nicolás", apellido: "Romero" },
    cupoMaximo: 16,
  },
  {
    tipo: "Movilidad",
    profesor: { id: 6, nombre: "Sofía", apellido: "Torres" },
    cupoMaximo: 20,
  },
];

const grupos = [
  "inicial mañana",
  "intermedio mañana",
  "inicial tarde",
  "intermedio tarde",
  "avanzado noche",
];

const clases = actividades.flatMap((actividad, indiceActividad) =>
  grupos.map((grupo, indiceGrupo) => {
    const cuposOcupados = [
      0,
      actividad.cupoMaximo,
      Math.floor(actividad.cupoMaximo / 2),
      actividad.cupoMaximo - 1,
      5 + indiceActividad,
    ][indiceGrupo];

    return {
      id: indiceActividad * grupos.length + indiceGrupo + 1,
      nombre: `${actividad.tipo} ${grupo}`,
      tipo: actividad.tipo,
      cupoMaximo: actividad.cupoMaximo,
      cuposOcupados,
      cuposDisponibles: actividad.cupoMaximo - cuposOcupados,
      profesor: { ...actividad.profesor },
    };
  }),
);

assert.equal(clases.length, 30);
assert.equal(new Set(clases.map((clase) => clase.id)).size, 30);
assert.equal(new Set(clases.map((clase) => clase.nombre)).size, 30);

const campos = [
  "id", "nombre", "tipo", "cupoMaximo",
  "cuposOcupados", "cuposDisponibles", "profesor",
].sort();

for (const clase of clases) {
  assert.deepEqual(Object.keys(clase).sort(), campos);
  assert.ok(Number.isInteger(clase.id) && clase.id > 0);
  assert.ok(clase.nombre.trim().length > 0);
  assert.ok(clase.tipo.trim().length > 0);
  assert.ok(Number.isInteger(clase.cupoMaximo) && clase.cupoMaximo > 0);
  assert.ok(Number.isInteger(clase.cuposOcupados));
  assert.ok(clase.cuposOcupados >= 0);
  assert.ok(clase.cuposOcupados <= clase.cupoMaximo);
  assert.equal(
    clase.cuposDisponibles,
    clase.cupoMaximo - clase.cuposOcupados,
  );
  assert.deepEqual(
    Object.keys(clase.profesor).sort(),
    ["apellido", "id", "nombre"],
  );
  assert.ok(Number.isInteger(clase.profesor.id) && clase.profesor.id > 0);
  assert.ok(clase.profesor.nombre.trim().length > 0);
  assert.ok(clase.profesor.apellido.trim().length > 0);
}

fs.mkdirSync("src/mocks", { recursive: true });
fs.writeFileSync(
  "src/mocks/clases.json",
  JSON.stringify(clases, null, 2) + "\n",
  { encoding: "utf8", flag: "wx" },
);

console.log("OK: 30 clases, IDs únicos, estructura y cupos válidos.");
