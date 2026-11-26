export type CuotaEstado = 'pagada' | 'pendiente' | 'vencida'


export interface CuotaAlumno {
  id: number
  nombre: string
  apellido: string
}

export interface CuotaPago {
  id: number
  fechaPago: string // AAAA-MM-DD
  medioPago: string
}

export interface Cuota {
  id: number
  alumno: CuotaAlumno
  periodo: string // AAAA-MM
  monto: number
  fechaVencimiento: string // AAAA-MM-DD
  estado: CuotaEstado // lo calcula el back
  pago: CuotaPago | null
}

// Cuota tal como se guarda: el estado no se guarda, se calcula al consultar.
export type CuotaRegistro = Omit<Cuota, 'estado'>