import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import API from "./api";

// Tipos de evento que publica el backend (RealtimeEventTypes en DeploymentHub.Application).
export const RealtimeEvents = {
  DEPLOYMENT_CREATED: "deployment.created",
  DEPLOYMENT_UPDATED: "deployment.updated",
  DEPLOYMENT_SUBMITTED: "deployment.submitted",
  DEPLOYMENT_STATUS_CHANGED: "deployment.status_changed",
  TARGET_STATUS_CHANGED: "target.status_changed",
  ARTIFACT_ADDED_TO_CATALOG: "artifact.added_to_catalog",
  INSTALLATION_UPDATED: "installation.updated",
};

export const ConnectionStatus = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  DISCONNECTED: "disconnected",
};

function buildHubUrl() {
  // La API vive en <host>/api; el hub en <host>/hubs/deployments.
  const apiBase = API.defaults.baseURL || window.location.origin;
  return `${apiBase.replace(/\/api\/?$/i, "")}/hubs/deployments`;
}

/**
 * Se conecta al hub de despliegues (SignalR) y entrega cada evento.
 *
 * @param {object} options
 * @param {string} [options.token] JWT; se envía cuando exista autenticación.
 * @param {(event: {type: string, requestId?: string, occurredAt: string, payload: any}) => void} [options.onEvent]
 *        Recibe todos los eventos.
 * @param {(event) => void} [options.onDeploymentChange] Atajo: cualquier evento que afecte una solicitud.
 * @param {(status: string) => void} [options.onStatusChange] Estado de la conexión (ConnectionStatus).
 * @returns {() => void} Función para desconectar.
 */
export function connectDeploymentsRealtime({
  token,
  onEvent,
  onDeploymentChange,
  onStatusChange,
} = {}) {
  let stopped = false;
  let retryTimer = null;

  const connection = new HubConnectionBuilder()
    .withUrl(buildHubUrl(), {
      accessTokenFactory: token ? () => token : undefined,
    })
    // Reintentos: 0s, 2s, 5s, 10s y luego cada 30s mientras la pestaña siga abierta.
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: ({ previousRetryCount }) =>
        [0, 2000, 5000, 10000][previousRetryCount] ?? 30000,
    })
    .configureLogging(LogLevel.Warning)
    .build();

  connection.on("deploymentEvent", (event) => {
    onEvent?.(event);
    if (event?.requestId) {
      onDeploymentChange?.(event);
    }
  });

  connection.onreconnecting(() => onStatusChange?.(ConnectionStatus.RECONNECTING));
  connection.onreconnected(() => onStatusChange?.(ConnectionStatus.CONNECTED));
  connection.onclose(() => {
    onStatusChange?.(ConnectionStatus.DISCONNECTED);
    scheduleStart(30000);
  });

  // La reconexión automática solo cubre cortes después de conectar;
  // si el primer intento falla (API caída) se reintenta aquí.
  function scheduleStart(delay) {
    if (stopped) return;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(start, delay);
  }

  async function start() {
    if (stopped || connection.state !== HubConnectionState.Disconnected) return;
    onStatusChange?.(ConnectionStatus.CONNECTING);
    try {
      await connection.start();
      onStatusChange?.(ConnectionStatus.CONNECTED);
    } catch {
      onStatusChange?.(ConnectionStatus.DISCONNECTED);
      scheduleStart(5000);
    }
  }

  // Se arranca en el siguiente tick: si el componente se desmonta enseguida (StrictMode en desarrollo)
  // la conexión ni siquiera empieza, en lugar de cortarse a mitad de la negociación.
  scheduleStart(0);

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    connection.stop();
  };
}
