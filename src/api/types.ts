export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
}

export interface PortalesResponse {
  status: string;
  data?: Array<{
    portal: number;
    dominio: string;
    emisora?: number;
    nombre_portal?: string;
  }>;
}

export interface GrabarMedialogPayload {
  emisora: number;
  emision: number;
  fecha: string;
  usuario: string;
  evento: number;
  superabstract: string;
  pendiente: number;
  /**
   * abstract: SIEMPRE debe ser la URL original de la nota (string plano).
   * El backend trata este campo (TEXT por compatibilidad) para búsquedas
   * tipo LIKE '%%' mediante el query param ?abstract=...
   * Nunca dejarlo vacío si tenemos URL.
   */
  abstract: string;
  transcripcion: string;
  analisis?: string;
}

export interface APIResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}
