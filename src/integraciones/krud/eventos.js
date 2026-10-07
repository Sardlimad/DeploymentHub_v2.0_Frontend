/**
 * Avisa a KRUD de que una operación terminó bien, para cerrar como completada la guía cuyo
 * `fin.evento` coincide (ver recorridos.json). Sin KRUD montado, el evento no hace nada.
 * @param {"solicitud-enviada" | "resultado-registrado" | "paquete-creado" | "producto-asignado"} operacion
 */
export const confirmarKrud = (operacion) =>
  window.dispatchEvent(new CustomEvent("krud:confirmacion", { detail: { operacion } }));
