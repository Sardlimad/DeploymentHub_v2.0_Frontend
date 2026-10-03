import API from "./api";
import { changePassword } from "./auth";

export const getUsers = async () => {
  const response = await API.get("/users");
  return response;
};

/** userData: { name, email, roleId, password? } (sin contraseña, el usuario la crea con «¿Olvidaste tu contraseña?») */
export const createUser = async (userData) => {
  const response = await API.post("/users", userData);
  return response;
};

export const deleteUser = async (userId) => {
  const response = await API.delete(`/users/${userId}`);
  return response;
};

/** userData: { id, name, email, roleId, isActive?, password? } */
export const updateUser = async (userData) => {
  const response = await API.put(`/users/${userData.id}`, userData);
  return response;
};

/** Cambia la contraseña del usuario con sesión. Acepta el formato anterior (current_password/new_password). */
export const changeUserPassword = async ({ current_password, new_password }) =>
  changePassword({ currentPassword: current_password, newPassword: new_password });
