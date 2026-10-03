// Etiquetas y colores de los estados que devuelve la API v2 (los enums viajan como texto).

export const RequestStatus = {
  Draft: { label: "Borrador", color: "gray" },
  Pending: { label: "Pendiente", color: "yellow" },
  Approved: { label: "Aprobada", color: "cyan" },
  InProgress: { label: "En curso", color: "blue" },
  Completed: { label: "Completada", color: "green" },
  PartiallyCompleted: { label: "Parcial", color: "orange" },
  Failed: { label: "Fallida", color: "red" },
  Cancelled: { label: "Cancelada", color: "gray" },
};

export const TargetStatus = {
  Pending: { label: "Pendiente", color: "yellow" },
  Scheduled: { label: "Programado", color: "cyan" },
  InProgress: { label: "En curso", color: "blue" },
  Applied: { label: "Aplicado", color: "green" },
  Failed: { label: "Fallido", color: "red" },
  Cancelled: { label: "Cancelado", color: "gray" },
  Skipped: { label: "Omitido", color: "gray" },
  RolledBack: { label: "Revertido", color: "purple" },
};

export const ArtifactType = {
  Module: "Módulo (frontend)",
  Service: "Servicio (API)",
  StoredProcedure: "Procedimiento almacenado",
  Table: "Tabla",
  DataScript: "Script de datos",
  View: "Vista",
  Function: "Función",
  Trigger: "Trigger",
  Report: "Reporte",
  Configuration: "Configuración",
  Other: "Otro",
};

export const ChangeType = {
  Added: { label: "Nuevo", color: "green" },
  Modified: { label: "Modificado", color: "blue" },
  Removed: { label: "Eliminado", color: "red" },
};

// Solicitudes que todavía requieren atención (enviadas y sin terminar).
export const IN_FLIGHT_STATUSES = ["Pending", "Approved", "InProgress"];
export const FINISHED_STATUSES = ["Completed", "PartiallyCompleted", "Failed"];

// Vistas rápidas de la lista de solicitudes.
export const REQUEST_VIEWS = [
  { key: "active", label: "En curso", statuses: IN_FLIGHT_STATUSES },
  { key: "draft", label: "Borradores", statuses: ["Draft"] },
  { key: "finished", label: "Terminadas", statuses: FINISHED_STATUSES },
  { key: "cancelled", label: "Canceladas", statuses: ["Cancelled"] },
  { key: "all", label: "Todas", statuses: [] },
];

/**
 * Texto del botón para llevar un destino a cada estado. El mismo estado se nombra distinto
 * según de dónde venga (Scheduled desde Failed es un reintento).
 */
export const targetActionLabel = (from, to) => {
  if (to === "Scheduled") return from === "Failed" || from === "RolledBack" ? "Reintentar" : "Programar";
  return (
    {
      Pending: "Volver a pendiente",
      InProgress: "Iniciar",
      Applied: "Marcar aplicado",
      Failed: "Marcar fallido",
      Skipped: "Omitir",
      Cancelled: "Cancelar",
      RolledBack: "Revertir",
    }[to] ?? to
  );
};

/**
 * Acciones con botón propio en cada fila: reportar el resultado y reintentar un fallo.
 * El resto (iniciar, programar, omitir, revertir…) va en el menú «Más» para no saturar la lista.
 */
export const isPrimaryTargetAction = (from, to) =>
  to === "Applied" || to === "Failed" || (to === "Scheduled" && (from === "Failed" || from === "RolledBack"));

// Texto corto para los botones de la fila.
export const targetButtonLabel = (from, to) =>
  ({ Applied: "Aplicado", Failed: "Falló" })[to] ?? targetActionLabel(from, to);

export const ArtifactExecution = {
  Pending: { label: "Pendiente", color: "gray" },
  Applied: { label: "Aplicado", color: "green" },
  Failed: { label: "Fallido", color: "red" },
  Skipped: { label: "Omitido", color: "gray" },
};
