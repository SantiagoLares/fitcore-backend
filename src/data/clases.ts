import clasesMock from '../mocks/clases.json';
import horariosMock from '../mocks/horarios.json';
import type { Clase } from '../models/clase.js';
import type { Horario } from '../models/horario.js';

export const clases: Clase[] = structuredClone(clasesMock);

export const horarios: Horario[] = structuredClone(horariosMock) as Horario[];
