import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogoMark, Wordmark } from "./brand/Logo";
import { Box, Button, Flex, HStack, Text, Tooltip, VStack } from "@chakra-ui/react";
import {
  FiActivity,
  FiBox,
  FiBriefcase,
  FiGrid,
  FiLayers,
  FiPackage,
  FiPlus,
  FiSend,
  FiUsers,
} from "react-icons/fi";
import { AuthContext } from "../context/AuthContext";

// Navegación por tareas. `roles` vacío = visible para cualquier sesión (ADMIN ve todo).
const NAV_GROUPS = [
  {
    label: "Operación",
    items: [
      { to: "/dashboard", label: "Panel", icon: FiGrid },
      { to: "/deployments", label: "Solicitudes", icon: FiSend },
      { to: "/clients-status", label: "Estado de clientes", icon: FiActivity },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { to: "/packages", label: "Paquetes", icon: FiPackage },
      { to: "/catalogs/products", label: "Productos", icon: FiBox },
      { to: "/catalogs/clients", label: "Clientes", icon: FiBriefcase },
      { to: "/catalogs/environments", label: "Ambientes", icon: FiLayers },
    ],
  },
  {
    label: "Administración",
    items: [{ to: "/users", label: "Usuarios", icon: FiUsers, roles: ["ADMIN"] }],
  },
];

function NavItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon;
  const link = (
    <Box
      as={NavLink}
      to={item.to}
      onClick={onNavigate}
      data-guia={`menu${item.to.replaceAll("/", ".")}`}
      display="flex"
      alignItems="center"
      gap={3}
      px={3}
      py={2}
      rounded="md"
      fontSize="sm"
      fontWeight={600}
      color="text.muted"
      justifyContent={collapsed ? "center" : "flex-start"}
      _hover={{ bg: "bg.hover", color: "accent.fg" }}
      _activeLink={{ bg: "accent.subtle", color: "accent.fg" }}
      _focusVisible={{ outline: "2px solid", outlineColor: "brand.400" }}
    >
      <Box as={Icon} fontSize="18px" flexShrink={0} />
      {!collapsed && <Text as="span">{item.label}</Text>}
    </Box>
  );

  return collapsed ? (
    <Tooltip label={item.label} placement="right" openDelay={200}>
      {link}
    </Tooltip>
  ) : (
    link
  );
}

/** Contenido de la barra lateral; se usa fijo en escritorio y dentro del Drawer en móvil. */
export default function Sidebar({ collapsed = false, onNavigate }) {
  const { hasRole } = useContext(AuthContext);
  const navigate = useNavigate();
  const canCreate = hasRole("DEVELOPER");

  return (
    <Flex direction="column" h="full" py={4} px={collapsed ? 2 : 3} gap={5}>
      <HStack px={collapsed ? 0 : 2} justify={collapsed ? "center" : "flex-start"} spacing={2.5}>
        <LogoMark size={30} title="DeploymentHub" />
        {!collapsed && <Wordmark fontSize="lg" />}
      </HStack>

      {canCreate && (
        <Tooltip label="Nueva solicitud" placement="right" isDisabled={!collapsed}>
          <Button
            leftIcon={collapsed ? undefined : <FiPlus />}
            onClick={() => {
              navigate("/deployments/new");
              onNavigate?.();
            }}
            size="sm"
            px={collapsed ? 0 : 4}
            aria-label="Nueva solicitud"
            data-guia="menu.nueva-solicitud"
          >
            {collapsed ? <FiPlus /> : "Nueva solicitud"}
          </Button>
        </Tooltip>
      )}

      <VStack align="stretch" spacing={5} flex="1" overflowY="auto">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.roles || hasRole(...item.roles.filter((r) => r !== "ADMIN")));
          if (items.length === 0) return null;
          return (
            <Box key={group.label}>
              {!collapsed && (
                <Text px={3} mb={1.5} fontSize="xs" fontWeight={700} color="text.muted" letterSpacing="0.06em" textTransform="uppercase">
                  {group.label}
                </Text>
              )}
              <VStack align="stretch" spacing={0.5}>
                {items.map((item) => (
                  <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
                ))}
              </VStack>
            </Box>
          );
        })}
      </VStack>
    </Flex>
  );
}
