import { Router } from 'express';
import { clases, horarios } from '../data/clases.js';
import { usuarios } from '../data/usuarios.js';
import profesoresMock from '../mocks/profesores.json';
import { requerirSesion, verificarPerfil } from '../http/auth.js';
import { sendPaginated } from '../http/response.js';
import { listarHorarios } from '../services/horarios.js';

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

export default horariosRouter;
