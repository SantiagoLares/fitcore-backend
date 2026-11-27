import { Router } from 'express';
import alumnosMock from '../mocks/alumnos.json';
import { sendPaginated, sendSuccess } from '../http/response.js';
import { listarAlumnos, obtenerAlumnoPorId } from '../services/alumnos.js';
import type { Alumno } from '../models/alumno.js';

// Estado en memoria: los cambios se reinician al reiniciar el servidor.
const alumnos: Alumno[] = structuredClone(alumnosMock) as Alumno[];

const alumnosRouter = Router();

alumnosRouter.get('/', (req, res) => {
    const result = listarAlumnos(alumnos, req.query);

    return sendPaginated(res, result);
});

alumnosRouter.get('/:id', (req, res) => {
    const alumno = obtenerAlumnoPorId(alumnos, req.params.id);

    return sendSuccess(res, alumno);
});

export default alumnosRouter;