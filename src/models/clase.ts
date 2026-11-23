export interface ClaseProfesor {
  id: number;
  nombre: string;
  apellido: string;
}

export interface Clase {
  id: number;
  nombre: string;
  tipo: string;
  cupoMaximo: number;
  cuposOcupados: number;
  cuposDisponibles: number;
  profesor: ClaseProfesor;
}