export type MedioPago =
  | "efectivo"
  | "transferencia"
  | "debito"
  | "credito";

export interface PagoAlumno {
  id: number;
  nombre: string;
  apellido: string;
}

export interface PagoCuota {
  id: number;
  periodo: string;
  alumno: PagoAlumno;
}

export interface PagoUsuario {
  id: number;
  nombre: string;
}

export interface Pago {
  id: number;
  cuota: PagoCuota;
  fechaPago: string;
  monto: number;
  medioPago: MedioPago;
  registradoPor: PagoUsuario;
}