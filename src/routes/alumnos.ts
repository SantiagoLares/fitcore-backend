import { Router } from 'express';
import alumnosMock from '../mocks/alumnos.json';
import { sendPaginated } from '../http/response.js';
import { listarAlumnos } from '../services/alumnos.js';
import type { Alumno } from '../models/alumno.js';

// Estado en memoria: los cambios se reinician al reiniciar el servidor.
const alumnos: Alumno[] = structuredClone(alumnosMock) as Alumno[];

const alumnosRouter = Router();

alumnosRouter.get('/', (req, res) => {
    const result = listarAlumnos(alumnos, req.query);

    return sendPaginated(res, result);
});

export default alumnosRouter;