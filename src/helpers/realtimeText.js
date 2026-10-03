import { RealtimeEvents } from "../services/deploymentsRealtime";
import { RequestStatus, TargetStatus } from "./deploymentStatus";

/**
 * Convierte un evento en tiempo real en una línea legible para la actividad en vivo.
 * @returns {{ text: string, tone: string, requestId?: string }}
 */
export function describeEvent(event) {
  const p = event.payload ?? {};
  const number = p.displayNumber ?? "Solicitud";

  switch (event.type) {
    case RealtimeEvents.DEPLOYMENT_CREATED:
      return { text: `${number} creada como borrador`, tone: "gray", requestId: event.requestId };
    case RealtimeEvents.DEPLOYMENT_SUBMITTED:
      return { text: `${number} enviada a ${p.targetsTotal ?? 0} clientes`, tone: "brand", requestId: event.requestId };
    case RealtimeEvents.DEPLOYMENT_UPDATED:
      return { text: `${number} actualizada`, tone: "gray", requestId: event.requestId };
    case RealtimeEvents.DEPLOYMENT_STATUS_CHANGED:
      return {
        text: `${number} pasó a «${RequestStatus[p.status]?.label ?? p.status}»`,
        tone: RequestStatus[p.status]?.color ?? "gray",
        requestId: event.requestId,
      };
    case RealtimeEvents.TARGET_STATUS_CHANGED:
      return {
        text: `${number}: ${p.target?.clientName ?? "cliente"} → ${TargetStatus[p.target?.status]?.label ?? p.target?.status}`,
        tone: TargetStatus[p.target?.status]?.color ?? "gray",
        requestId: event.requestId,
      };
    case RealtimeEvents.ARTIFACT_ADDED_TO_CATALOG:
      return { text: `Nuevo artefacto en el catálogo: ${p.artifact?.code ?? ""}`, tone: "green" };
    case RealtimeEvents.INSTALLATION_UPDATED:
      return { text: "Un cliente cambió de versión", tone: "brand" };
    default:
      return { text: event.type, tone: "gray" };
  }
}
