import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerOverlay, Flex } from "@chakra-ui/react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useSidebar } from "../context/SidebarContext";

const COLLAPSE_KEY = "dh.sidebarCollapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Estructura de todas las pantallas con sesión: barra lateral fija en escritorio
 * (contraíble a iconos) y en panel deslizable en móvil.
 */
export default function Layout({ children }) {
  const { isOpen, onOpen, onClose } = useSidebar();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const location = useLocation();

  // Al navegar en móvil se cierra el menú.
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1");
      } catch {
        // Preferencia de comodidad: si no se puede guardar, solo dura la sesión.
      }
      return !prev;
    });
  };

  return (
    <Flex minH="100vh" bg="bg.canvas">
      <Box
        as="nav"
        aria-label="Navegación principal"
        display={{ base: "none", lg: "block" }}
        w={collapsed ? "72px" : "248px"}
        flexShrink={0}
        bg="bg.surface"
        borderRightWidth="1px"
        borderColor="border.subtle"
        position="sticky"
        top={0}
        h="100vh"
        transition="width 0.2s ease"
      >
        <Sidebar collapsed={collapsed} />
      </Box>

      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="280px" bg="bg.surface">
          <DrawerCloseButton />
          <DrawerBody p={0}>
            <Sidebar onNavigate={onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Flex direction="column" flex="1" minW={0}>
        <Navbar onOpenMobile={onOpen} onToggleCollapse={toggleCollapsed} />
        <Box as="main" flex="1" px={{ base: 4, md: 8 }} py={{ base: 5, md: 8 }} maxW="1440px" w="full" mx="auto">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
