export interface Clase {
  id: number;
  nombre: string;
  descripcion: string;
  profesorId: number;
  fechaHoraInicio: string;
  duracionMinutos: number;
  cupoMaximo: number;
}