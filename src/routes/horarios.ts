import { Router } from 'express';
import { clases, horarios } from '../data/clases.js';
import { usuarios } from '../data/usuarios.js';
import profesoresMock from '../mocks/profesores.json';
import { requerirSesion, verificarPerfil } from '../http/auth.js';
import { sendPaginated } from '../http/response.js';
import { listarHorarios, obtenerHorarioPorId } from '../services/horarios.js';
import { HttpError } from '../http/error-handler.js';
import { crearHorario, modificarHorario, eliminarHorario } from '../services/horarios-write.js';

const horariosRouter = Router();

horariosRouter.get('/', requerirSesion, (req, res) => {
  const usuario = verificarPerfil(usuarios, res.locals.usuarioId, [
    'Administración',
    'Profesor',
    'Alumno',
  ]);

  let horariosPermitidos = horarios;

  if (usuario.perfil === 'Profesor') {
    const profesor = profesoresMock.find((item) => item.usuarioId === usuario.id);

    const clasesPermitidas = new Set(
      clases.filter((clase) => clase.profesor.id === profesor?.id).map((clase) => clase.id),
    );

    horariosPermitidos = horarios.filter((horario) => clasesPermitidas.has(horario.claseId));
  }

  const result = listarHorarios(horariosPermitidos, clases, req.query);

  return sendPaginated(res, result);
});

horariosRouter.get('/:id', requerirSesion, (req, res) => {
  const usuario = verificarPerfil(usuarios, res.locals.usuarioId, [
    'Administración',
    'Profesor',
    'Alumno',
  ]);

  const horario = obtenerHorarioPorId(horarios, req.params.id);

  if (usuario.perfil === 'Profesor') {
    const profesor = profesoresMock.find((item) => item.usuarioId === usuario.id);

    const clase = clases.find((item) => item.id === horario.claseId);

    if (!profesor || clase?.profesor.id !== profesor.id) {
      throw new HttpError(403, 'FORBIDDEN', 'No tiene permiso para consultar este horario');
    }
  }

  return res.status(200).json(horario);
});

horariosRouter.post('/', requerirSesion, (req, res) => {
  verificarPerfil(usuarios, res.locals.usuarioId, ['Administración']);

  const horario = crearHorario(horarios, clases, req.body);

  return res.status(201).json(horario);
});

horariosRouter.put('/:id', requerirSesion, (req, res) => {
  verificarPerfil(usuarios, res.locals.usuarioId, ['Administración']);

  const horario = modificarHorario(horarios, req.params.id, req.body);

  return res.status(200).json(horario);
});

horariosRouter.delete('/:id', requerirSesion, (req, res) => {
  verificarPerfil(usuarios, res.locals.usuarioId, ['Administración']);

  eliminarHorario(horarios, req.params.id);

  return res.status(204).send();
});

export default horariosRouter;
