import API from "./api";

export const getRoles = async () => {
  const response = await API.get("/roles/");
  return response;
};