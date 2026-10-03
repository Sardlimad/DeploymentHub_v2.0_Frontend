import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "./AuthContext";
import {
  ConnectionStatus,
  connectDeploymentsRealtime,
} from "../services/deploymentsRealtime";

export const RealtimeContext = createContext({
  status: ConnectionStatus.DISCONNECTED,
  events: [],
  subscribe: () => () => {},
});

const MAX_EVENTS = 30;

/**
 * Una sola conexión SignalR por sesión. Las pantallas se suscriben con useRealtime(handler)
 * y el panel muestra los últimos eventos como actividad en vivo.
 */
export function RealtimeProvider({ children }) {
  const { token } = useContext(AuthContext);
  const [status, setStatus] = useState(ConnectionStatus.DISCONNECTED);
  const [events, setEvents] = useState([]);
  const subscribersRef = useRef(new Set());

  useEffect(() => {
    if (!token) return undefined;

    return connectDeploymentsRealtime({
      token,
      onStatusChange: setStatus,
      onEvent: (event) => {
        setEvents((prev) => [{ ...event, receivedAt: Date.now() }, ...prev].slice(0, MAX_EVENTS));
        subscribersRef.current.forEach((handler) => {
          try {
            handler(event);
          } catch (error) {
            console.error("Error al procesar evento en tiempo real", error);
          }
        });
      },
    });
  }, [token]);

  const subscribe = useCallback((handler) => {
    subscribersRef.current.add(handler);
    return () => subscribersRef.current.delete(handler);
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        status: token ? status : ConnectionStatus.DISCONNECTED,
        events: token ? events : [],
        subscribe,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
