import { useContext, useEffect, useRef } from "react";
import { RealtimeContext } from "../context/RealtimeContext";

/**
 * Suscribe el componente a los eventos de despliegue mientras esté montado.
 * Usa la conexión única de RealtimeProvider; el callback puede cambiar entre renders.
 *
 * @param {(event) => void} [onEvent]
 * @returns {string} estado de la conexión (ConnectionStatus)
 */
export function useDeploymentsRealtime(onEvent) {
  const { status, subscribe } = useContext(RealtimeContext);
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => subscribe((event) => handlerRef.current?.(event)), [subscribe]);

  return status;
}

/**
 * Ejecuta `refresh` (agrupando ráfagas) cuando llega un evento que cumple `filter`.
 * Útil para recargar una lista o un detalle sin repetir lógica en cada pantalla.
 */
export function useRealtimeRefresh(refresh, filter = () => true, delay = 300) {
  const timerRef = useRef(null);
  const status = useDeploymentsRealtime((event) => {
    if (!filter(event)) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => refresh(), delay);
  });

  useEffect(() => () => clearTimeout(timerRef.current), []);
  return status;
}
