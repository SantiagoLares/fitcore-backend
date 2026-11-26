import { Router } from 'express';
import cuotasMock from '../mocks/cuotas.json';
import { sendPaginated, sendSuccess } from '../http/response.js';
import { listarCuotas, obtenerCuotaPorId } from '../services/cuotas.js';
import type { CuotaRegistro } from '../models/cuota.js';

// Estado en memoria: los cambios se reinician al reiniciar el servidor.
const cuotas: CuotaRegistro[] = structuredClone(cuotasMock) as CuotaRegistro[];

const cuotasRouter = Router();

cuotasRouter.get('/', (req, res) => {
    const result = listarCuotas(cuotas, req.query);

    return sendPaginated(res, result);
});

cuotasRouter.get('/:id', (req, res) => {
    const cuota = obtenerCuotaPorId(cuotas, req.params.id);

    return sendSuccess(res, cuota);
});

export default cuotasRouter;