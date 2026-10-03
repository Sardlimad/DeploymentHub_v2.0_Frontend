import { Box, Button, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiHome } from "react-icons/fi";
import { BrandMark } from "../auth/AuthShell";
import { AuthContext } from "../../context/AuthContext";

/** Pantalla de estado a página completa (403, 404) con salida hacia atrás o al inicio. */
export default function StatusScreen({ code, title, description, icon }) {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const home = token ? "/dashboard" : "/login";

  return (
    <Flex minH="100dvh" bg="bg.canvas" align="center" justify="center" px={4}>
      <Stack spacing={6} maxW="440px" w="full" textAlign="center" align="center">
        <HStack spacing={2.5}>
          <BrandMark size="18px" />
          <Text fontWeight={800} letterSpacing="-0.02em">
            DeploymentHub
          </Text>
        </HStack>
        <Box fontSize="4xl" color="accent.fg" bg="accent.subtle" rounded="full" p={4}>
          {icon}
        </Box>
        <Box>
          <Text fontFamily="mono" fontSize="sm" color="text.muted">
            Error {code}
          </Text>
          <Text as="h1" fontSize="2xl" fontWeight={800} letterSpacing="-0.02em" mt={1}>
            {title}
          </Text>
          <Text color="text.muted" mt={2}>
            {description}
          </Text>
        </Box>
        <HStack spacing={3}>
          <Button variant="outline" leftIcon={<FiArrowLeft />} onClick={() => navigate(-1)}>
            Volver
          </Button>
          <Button leftIcon={<FiHome />} onClick={() => navigate(home)}>
            {token ? "Ir al panel" : "Iniciar sesión"}
          </Button>
        </HStack>
      </Stack>
    </Flex>
  );
}
