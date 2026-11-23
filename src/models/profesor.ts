export interface Profesor {
  id: number;
  usuarioId: number;
  dni: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  especialidad: string;
}

export interface ProfesorDetalle extends Profesor {
  clases: {
    id: number;
    nombre: string;
  }[];
}