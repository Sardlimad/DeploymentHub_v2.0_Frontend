import { Box, Flex, HStack, Image, Stack, Text } from "@chakra-ui/react";
import { FiActivity, FiPackage, FiUsers } from "react-icons/fi";

const HIGHLIGHTS = [
  { icon: <FiUsers />, title: "Qué tiene cada cliente", text: "Versión vigente por ambiente y quién está desactualizado." },
  { icon: <FiPackage />, title: "Paquetes sin transcribir", text: "Los scripts y reportes se detectan desde el .zip del paquete." },
  { icon: <FiActivity />, title: "Estado en vivo", text: "Cada solicitud muestra su avance por cliente en tiempo real." },
];

export function BrandMark({ size = "28px", invert = true }) {
  return (
    <Box bg="brand.600" rounded="lg" p={2} flexShrink={0}>
      <Image src="/noun-rocket-2280859.svg" alt="" boxSize={size} filter={invert ? "invert(1)" : "none"} />
    </Box>
  );
}

/**
 * Marco de las pantallas sin sesión (inicio de sesión, recuperación): panel de marca a la izquierda
 * en escritorio y el formulario a la derecha. En móvil queda solo el formulario con la marca arriba.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <Flex minH="100dvh" bg="bg.canvas">
      <Flex
        display={{ base: "none", lg: "flex" }}
        direction="column"
        justify="space-between"
        w="44%"
        maxW="560px"
        bgGradient="linear(160deg, brand.800, brand.900)"
        color="white"
        p={12}
      >
        <HStack spacing={3}>
          <BrandMark />
          <Text fontWeight={800} fontSize="xl" letterSpacing="-0.02em">
            DeploymentHub
          </Text>
        </HStack>

        <Stack spacing={8}>
          <Text fontSize="3xl" fontWeight={800} lineHeight="1.15" letterSpacing="-0.02em" sx={{ textWrap: "balance" }}>
            Saber qué se desplegó, dónde y cuándo.
          </Text>
          <Stack spacing={5}>
            {HIGHLIGHTS.map(({ icon, title, text }) => (
              <HStack key={title} align="flex-start" spacing={4}>
                <Box bg="whiteAlpha.200" rounded="md" p={2} mt={0.5}>
                  {icon}
                </Box>
                <Box>
                  <Text fontWeight={700}>{title}</Text>
                  <Text color="whiteAlpha.800" fontSize="sm">
                    {text}
                  </Text>
                </Box>
              </HStack>
            ))}
          </Stack>
        </Stack>

        <Text fontSize="xs" color="whiteAlpha.700">
          © {new Date().getFullYear()} DeploymentHub · Software libre (GPL v3)
        </Text>
      </Flex>

      <Flex flex="1" align="center" justify="center" px={4} py={10}>
        <Box w="full" maxW="400px">
          <HStack spacing={3} mb={8} display={{ base: "flex", lg: "none" }}>
            <BrandMark size="22px" />
            <Text fontWeight={800} fontSize="lg" letterSpacing="-0.02em">
              DeploymentHub
            </Text>
          </HStack>
          <Text as="h1" fontSize="2xl" fontWeight={800} letterSpacing="-0.02em">
            {title}
          </Text>
          {subtitle && (
            <Text color="text.muted" mt={1} mb={6}>
              {subtitle}
            </Text>
          )}
          {children}
          {footer && <Box mt={8}>{footer}</Box>}
        </Box>
      </Flex>
    </Flex>
  );
}
