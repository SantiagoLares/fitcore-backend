export type PerfilUsuario = "Alumno" | "Profesor" | "Administración";

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  perfil: PerfilUsuario;
  activo: boolean;
}