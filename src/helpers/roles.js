// Etiquetas de los códigos de rol que devuelve la API (ADMIN, INFRA, DEVELOPER).
export const RoleLabels = {
  ADMIN: "Administrador",
  INFRA: "Infraestructura",
  DEVELOPER: "Desarrollador",
};

export const RoleColors = {
  ADMIN: "purple",
  INFRA: "orange",
  DEVELOPER: "blue",
};

// Qué permite cada rol (refleja las políticas Admin, Deployer y Operator de la API).
export const RoleAbilities = {
  ADMIN: [
    "Todo lo que hacen Desarrollo e Infraestructura",
    "Gestionar productos, clientes, ambientes y artefactos del catálogo",
    "Crear usuarios y asignar roles",
  ],
  INFRA: [
    "Ver solicitudes, paquetes y el estado de los clientes",
    "Aprobar solicitudes enviadas",
    "Registrar el resultado por cliente (aplicado, fallido, revertido)",
  ],
  DEVELOPER: [
    "Ver solicitudes, paquetes y el estado de los clientes",
    "Crear paquetes y detectar sus scripts y reportes",
    "Crear solicitudes de despliegue y enviarlas a Infraestructura",
  ],
};

/** Código normalizado de un rol a partir de su nombre ("Administrador" o "ADMIN"). */
export const roleCode = (name) => {
  const upper = (name ?? "").toUpperCase();
  return Object.keys(RoleLabels).find((code) => code === upper || RoleLabels[code].toUpperCase() === upper) ?? upper;
};
