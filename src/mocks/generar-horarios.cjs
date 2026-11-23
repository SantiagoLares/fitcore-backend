const fs = require("node:fs");
const assert = require("node:assert/strict");

const clases = JSON.parse(
  fs.readFileSync("src/mocks/clases.json", "utf8"),
);

const dias = ["lunes", "martes", "miercoles", "jueves", "viernes"];
const turnos = [
  { horaInicio: "08:00", horaFin: "09:00" },
  { horaInicio: "10:00", horaFin: "11:00" },
  { horaInicio: "15:00", horaFin: "16:00" },
  { horaInicio: "17:00", horaFin: "18:00" },
  { horaInicio: "20:00", horaFin: "21:00" },
];

const horarios = clases.map((clase, indice) => ({
  id: indice + 1,
  claseId: clase.id,
  diaSemana: dias[Math.floor(indice / turnos.length) % dias.length],
  ...turnos[indice % turnos.length],
}));

const claseIds = new Set(clases.map((clase) => clase.id));

assert.equal(horarios.length, clases.length);
assert.equal(new Set(horarios.map((horario) => horario.id)).size, horarios.length);

for (const horario of horarios) {
  assert.ok(claseIds.has(horario.claseId));
  assert.ok(dias.includes(horario.diaSemana));
  assert.match(horario.horaInicio, /^([01]\d|2[0-3]):[0-5]\d$/);
  assert.match(horario.horaFin, /^([01]\d|2[0-3]):[0-5]\d$/);
  assert.ok(horario.horaFin > horario.horaInicio);
}

for (const clase of clases) {
  assert.ok(horarios.some((horario) => horario.claseId === clase.id));
}

fs.writeFileSync(
  "src/mocks/horarios.json",
  JSON.stringify(horarios, null, 2) + "\n",
  { encoding: "utf8", flag: "wx" },
);

console.log(`OK: ${horarios.length} horarios vinculados a clases existentes.`);