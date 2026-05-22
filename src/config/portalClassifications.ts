/**
 * Configuración de clasificaciones automáticas por portal.
 *
 * Cada vez que se guarda exitosamente un medialog,
 * se crean automáticamente las relaciones (POST /v1/relaciones/medialogs)
 * con las clasificaciones definidas aquí.
 *
 * Formato:
 *   portalId: [clasificacion1, clasificacion2, ...]
 *
 * tipo siempre es "R" (Relación).
 * fecha = fecha de la nota (ya normalizada a hora CDMX).
 */

export const PORTAL_CLASSIFICATIONS: Record<number, number[]> = {
  // El País (portal 4014)
  4014: [25609],

  // Financial Times - PressReader (portal 10725)
  10725: [25872],

  // Ejemplos de otros portales (agrega los que necesites):
  // 1234: [1001, 1002],
  // 9999: [500],
  // 0: [], // sin clasificaciones automáticas
};
