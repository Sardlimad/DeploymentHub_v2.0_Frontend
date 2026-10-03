import API from "./api";

// Contrato v2: api/Auth (ver DeploymentHub.Api/Controllers/AuthController.cs).

/** @returns respuesta con data = { accessToken, expiresAt, user: { id, name, email, role } } */
export const logIn = async ({ email, password }) =>
  API.post("/auth/login", { email, password });

export const getCurrentUser = async () => (await API.get("/auth/me")).data;

export const changePassword = ({ currentPassword, newPassword }) =>
  API.put("/auth/change-password", { currentPassword, newPassword });

export const requestPasswordRecovery = (email) =>
  API.post("/auth/password-recovery", { email });

export const verifyRecoveryCode = (email, code) =>
  API.post("/auth/password-recovery/verify", { email, code });

export const resetPassword = (email, code, password) =>
  API.post("/auth/password-recovery/reset", { email, code, password });
