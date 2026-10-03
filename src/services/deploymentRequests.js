import API from "./api";

// Contrato v2: api/DeploymentRequests (ver DeploymentHub.Api/Controllers/DeploymentRequestsController.cs).

/**
 * @param {{statuses?: string[], productId?: string, clientId?: string, search?: string, page?: number, pageSize?: number}} filter
 * @returns {Promise<{items: object[], page: number, pageSize: number, totalCount: number}>}
 */
export const searchDeploymentRequests = async ({ statuses = [], ...rest } = {}) => {
  const params = new URLSearchParams();
  statuses.forEach((s) => params.append("status", s));
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.append(key, value);
  });
  const { data } = await API.get(`/DeploymentRequests?${params.toString()}`);
  return data;
};

export const getDeploymentRequest = async (id) =>
  (await API.get(`/DeploymentRequests/${id}`)).data;

export const createDeploymentRequest = async ({ packageId, comment, tickets } = {}) =>
  (await API.post("/DeploymentRequests", { packageId, comment, tickets })).data;

export const updateDeploymentRequest = (id, { comment, tickets }) =>
  API.put(`/DeploymentRequests/${id}`, { id, comment, tickets });

export const associatePackage = (requestId, packageId) =>
  API.put(`/DeploymentRequests/${requestId}/package/${packageId}`);

export const addTargets = async (requestId, installationIds) =>
  (await API.post(`/DeploymentRequests/${requestId}/targets`, { installationIds })).data;

export const removeTarget = (requestId, targetId) =>
  API.delete(`/DeploymentRequests/${requestId}/targets/${targetId}`);

export const submitDeploymentRequest = (requestId) =>
  API.post(`/DeploymentRequests/${requestId}/submit`);

export const approveDeploymentRequest = (requestId) =>
  API.post(`/DeploymentRequests/${requestId}/approve`);

export const cancelDeploymentRequest = (requestId, reason) =>
  API.post(`/DeploymentRequests/${requestId}/cancel`, { reason });

/**
 * Reporta el estado de un cliente destino. Devuelve la solicitud con el estado general recalculado.
 * @param {{status: string, comment?: string, artifactResults?: {packageArtifactId: string, status: string, message?: string}[]}} body
 */
export const changeTargetStatus = async (requestId, targetId, body) =>
  (await API.put(`/DeploymentRequests/${requestId}/targets/${targetId}/status`, body)).data;
