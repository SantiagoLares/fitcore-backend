export type AlumnoEstado = 'activo' | 'baja'

export interface Alumno {
  id: number
  usuarioId: number
  dni: string
  nombre: string
  apellido: string
  email: string
  telefono: string
  fechaAlta: string // AAAA-MM-DD
  estado: AlumnoEstado
}
