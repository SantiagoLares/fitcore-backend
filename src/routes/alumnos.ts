import { Router } from 'express';
import alumnosMock from '../mocks/alumnos.json';
import { sendPaginated, sendSuccess } from '../http/response.js';
import { usuarios } from '../data/usuarios.js';
import {
    listarAlumnos,
    obtenerAlumnoPorId,
    crearAlumno,
    modificarAlumno,
    eliminarAlumno,
} from '../services/alumnos.js';
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

alumnosRouter.post('/', (req, res) => {
    const alumno = crearAlumno(alumnos, usuarios, req.body);

    res.location(`/api/v1/alumnos/${alumno.id}`);

    return sendSuccess(res, alumno, 201);
});

alumnosRouter.put('/:id', (req, res) => {
    const alumno = modificarAlumno(alumnos, usuarios, req.params.id, req.body);

    return sendSuccess(res, alumno);
});

alumnosRouter.delete('/:id', (req, res) => {
    eliminarAlumno(alumnos, req.params.id);

    return res.status(204).send();
});

export default alumnosRouter;