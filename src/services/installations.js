import API from "./api";

// Instalación = cliente × producto × ambiente, con el paquete que tiene aplicado.

/**
 * @param {{clientId?: string, productId?: string, environmentId?: string, onlyOutdated?: boolean}} filter
 */
export const getInstallations = async (filter = {}) =>
  (await API.get("/Installations", { params: filter })).data;

export const createInstallation = async ({ clientId, productEnvironmentId, baseUrl }) =>
  (await API.post("/Installations", { clientId, productEnvironmentId, baseUrl })).data;

export const updateInstallation = (id, { baseUrl, isActive }) =>
  API.put(`/Installations/${id}`, { id, baseUrl, isActive });

export const deleteInstallation = (id) => API.delete(`/Installations/${id}`);
