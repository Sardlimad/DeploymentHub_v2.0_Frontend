import API from "./api";

// Catálogo v2: todas las funciones devuelven directamente los datos (no la respuesta de axios).

// Productos
export const listProducts = async () => (await API.get("/Products")).data;
export const getProduct = async (id) => (await API.get(`/Products/${id}`)).data;
export const createProduct = async ({ code, name }) => (await API.post("/Products", { code, name })).data;
export const updateProduct = (id, { code, name, isActive = true }) =>
  API.put(`/Products/${id}`, { id, code, name, isActive });
export const deleteProduct = (id) => API.delete(`/Products/${id}`);
export const listProductEnvironments = async (productId) =>
  (await API.get(`/Products/${productId}/environments`)).data;
export const listProductArtifacts = async (productId, { type, search } = {}) =>
  (await API.get(`/Products/${productId}/artifacts`, { params: { type: type || undefined, search: search || undefined } })).data;

// Ambientes de un producto
export const addProductEnvironment = async ({ productId, environmentId, baseUrl }) =>
  (await API.post("/ProductEnvironments", { productId, environmentId, baseUrl })).data;
export const updateProductEnvironment = (id, { baseUrl, isActive = true }) =>
  API.put(`/ProductEnvironments/${id}`, { id, baseUrl, isActive });
export const deleteProductEnvironment = (id) => API.delete(`/ProductEnvironments/${id}`);

// Artefactos del catálogo (registro manual)
export const createProductArtifact = async (artifact) => (await API.post("/ProductArtifacts", artifact)).data;
export const updateProductArtifact = (id, artifact) => API.put(`/ProductArtifacts/${id}`, { ...artifact, id });
export const deleteProductArtifact = (id) => API.delete(`/ProductArtifacts/${id}`);

// Ambientes
export const listEnvironments = async () => (await API.get("/Environments")).data;
export const createEnvironment = async ({ code, name }) => (await API.post("/Environments", { code, name })).data;
export const updateEnvironment = (id, { code, name, isActive = true }) =>
  API.put(`/Environments/${id}`, { id, code, name, isActive });
export const deleteEnvironment = (id) => API.delete(`/Environments/${id}`);

// Clientes
export const listClients = async () => (await API.get("/Clients")).data;
export const createClient = async ({ code, name, isOnPremise }) =>
  (await API.post("/Clients", { code, name, isOnPremise })).data;
export const updateClient = (id, { code, name, isOnPremise, isActive = true }) =>
  API.put(`/Clients/${id}`, { id, code, name, isOnPremise, isActive });
export const deleteClient = (id) => API.delete(`/Clients/${id}`);
