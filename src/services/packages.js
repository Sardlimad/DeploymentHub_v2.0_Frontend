import API from "./api";

// Contrato v2: api/DeploymentPackages. Un artefacto se indica por productArtifactId (del catálogo)
// o por type + code; si no existe en el catálogo entra como nuevo (isNew = true).

export const getPackages = async (productId) =>
  (await API.get("/DeploymentPackages", { params: { productId } })).data;

export const getPackage = async (id) =>
  (await API.get(`/DeploymentPackages/${id}`)).data;

export const createPackage = async (packageData) =>
  (await API.post("/DeploymentPackages", packageData)).data;

export const updatePackage = (id, packageData) =>
  API.put(`/DeploymentPackages/${id}`, { ...packageData, id });

export const deletePackage = (id) => API.delete(`/DeploymentPackages/${id}`);

export const addPackageArtifact = async (packageId, artifact) =>
  (await API.post(`/DeploymentPackages/${packageId}/artifacts`, artifact)).data;

export const updatePackageArtifact = (packageId, packageArtifactId, { executionOrder, notes }) =>
  API.put(`/DeploymentPackages/${packageId}/artifacts/${packageArtifactId}`, {
    packageId,
    packageArtifactId,
    executionOrder,
    notes,
  });

export const removePackageArtifact = (packageId, packageArtifactId) =>
  API.delete(`/DeploymentPackages/${packageId}/artifacts/${packageArtifactId}`);

export const getProductArtifacts = async (productId, { type, search } = {}) =>
  (await API.get(`/Products/${productId}/artifacts`, { params: { type, search } })).data;
