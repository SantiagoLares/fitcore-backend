export type DiaSemana =
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado"
  | "domingo";

export interface Horario {
  id: number;
  claseId: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}