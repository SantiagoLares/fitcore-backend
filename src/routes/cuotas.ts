import { Router } from 'express';
import cuotasMock from '../mocks/cuotas.json';
import { sendPaginated } from '../http/response.js';
import { listarCuotas } from '../services/cuotas.js';
import type { CuotaRegistro } from '../models/cuota.js';

// Estado en memoria: los cambios se reinician al reiniciar el servidor.
const cuotas: CuotaRegistro[] = structuredClone(cuotasMock) as CuotaRegistro[];

const cuotasRouter = Router();

cuotasRouter.get('/', (req, res) => {
    const result = listarCuotas(cuotas, req.query);

    return sendPaginated(res, result);
});

export default cuotasRouter;