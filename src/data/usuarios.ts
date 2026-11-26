import usuariosMock from '../mocks/usuarios.json';
import { crearCredenciales } from '../services/auth.js';
import type { Usuario } from '../models/usuario.js';

// Estado en memoria compartido por Auth y Usuarios: así un usuario que se registra
// aparece en el listado. Los cambios se reinician al reiniciar el servidor.
export const usuarios: Usuario[] = structuredClone(usuariosMock) as Usuario[];

// Contraseñas cifradas, guardadas aparte para no devolverlas nunca.
export const credenciales = crearCredenciales(usuarios);
