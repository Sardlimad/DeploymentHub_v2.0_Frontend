import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Flex,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
  Tooltip,
  useColorMode,
} from "@chakra-ui/react";
import { FiLogOut, FiMenu, FiMoon, FiSidebar, FiSun, FiUser } from "react-icons/fi";
import { AuthContext } from "../context/AuthContext";
import { RealtimeContext } from "../context/RealtimeContext";
import { ConnectionStatus } from "../services/deploymentsRealtime";
import { RoleLabels } from "../helpers/roles";

const LIVE = {
  [ConnectionStatus.CONNECTED]: { label: "En vivo", color: "green.400", hint: "Los cambios llegan al instante." },
  [ConnectionStatus.CONNECTING]: { label: "Conectando", color: "gray.400", hint: "Conectando con el servidor…" },
  [ConnectionStatus.RECONNECTING]: { label: "Reconectando", color: "orange.400", hint: "Se perdió la conexión; reintentando." },
  [ConnectionStatus.DISCONNECTED]: {
    label: "Sin conexión en vivo",
    color: "red.400",
    hint: "Los datos no se actualizan solos. Revisa que la API esté levantada.",
  },
};

export default function Navbar({ onOpenMobile, onToggleCollapse }) {
  const navigate = useNavigate();
  const { colorMode, toggleColorMode } = useColorMode();
  const { user, logout } = useContext(AuthContext);
  const { status } = useContext(RealtimeContext);
  const live = LIVE[status] ?? LIVE[ConnectionStatus.DISCONNECTED];

  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      h="60px"
      px={{ base: 3, md: 5 }}
      bg="bg.surface"
      borderBottomWidth="1px"
      borderColor="border.subtle"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <HStack spacing={2}>
        <IconButton
          aria-label="Abrir menú"
          icon={<FiMenu />}
          variant="ghost"
          colorScheme="gray"
          display={{ base: "inline-flex", lg: "none" }}
          onClick={onOpenMobile}
        />
        <Tooltip label="Contraer o expandir el menú">
          <IconButton
            aria-label="Contraer menú"
            icon={<FiSidebar />}
            variant="ghost"
            colorScheme="gray"
            display={{ base: "none", lg: "inline-flex" }}
            onClick={onToggleCollapse}
          />
        </Tooltip>
      </HStack>

      <HStack spacing={{ base: 2, md: 4 }}>
        <Tooltip label={live.hint}>
          <HStack spacing={2} px={3} py={1} rounded="full" borderWidth="1px" borderColor="border.subtle" cursor="default">
            <Box w="8px" h="8px" rounded="full" bg={live.color} />
            <Text fontSize="xs" fontWeight={700} color="text.muted" display={{ base: "none", sm: "block" }}>
              {live.label}
            </Text>
          </HStack>
        </Tooltip>

        <Menu placement="bottom-end">
          <MenuButton aria-label="Menú de usuario" rounded="full" _focusVisible={{ outline: "2px solid", outlineColor: "brand.400" }}>
            <HStack spacing={3}>
              <Box textAlign="right" display={{ base: "none", md: "block" }}>
                <Text fontSize="sm" fontWeight={700} lineHeight="1.2">
                  {user?.name || "Usuario"}
                </Text>
                <Text fontSize="xs" color="text.muted">
                  {RoleLabels[user?.role] || user?.role}
                </Text>
              </Box>
              <Avatar size="sm" name={user?.name} bg="brand.600" color="white" />
            </HStack>
          </MenuButton>
          <MenuList>
            <MenuItem icon={<FiUser />} onClick={() => navigate("/profile")}>
              Mi perfil
            </MenuItem>
            <MenuItem icon={colorMode === "dark" ? <FiSun /> : <FiMoon />} onClick={toggleColorMode}>
              {colorMode === "dark" ? "Modo claro" : "Modo oscuro"}
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={<FiLogOut />} onClick={logout} color="red.500">
              Cerrar sesión
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>
  );
}
