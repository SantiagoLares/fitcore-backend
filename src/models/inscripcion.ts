export type EstadoInscripcion = "activa" | "cancelada";

export interface InscripcionAlumno {
  id: number;
  nombre: string;
  apellido: string;
}

export interface InscripcionClase {
  id: number;
  nombre: string;
}

export interface Inscripcion {
  id: number;
  alumno: InscripcionAlumno;
  clase: InscripcionClase;
  fechaInscripcion: string;
  estado: EstadoInscripcion;
}