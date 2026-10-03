import { Box, HStack, Text, Tooltip } from "@chakra-ui/react";

/**
 * Progreso de una solicitud por cliente: verde aplicados, rojo fallidos, gris pendientes.
 * Muestra de un vistazo si hay fallos aunque la mayoría haya salido bien.
 */
export default function TargetProgress({ applied = 0, failed = 0, pending = 0, total = 0, showLabel = true, width = "100%" }) {
  const other = Math.max(total - applied - failed - pending, 0); // cancelados u omitidos
  const pct = (n) => (total ? `${(n / total) * 100}%` : "0%");

  return (
    <Tooltip label={`${applied} aplicados · ${failed} fallidos · ${pending} pendientes${other ? ` · ${other} cancelados u omitidos` : ""}`} hasArrow>
      <Box w={width}>
        {showLabel && (
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs" color="text.muted" className="tabular">
              {applied + failed} de {total} clientes
            </Text>
            {failed > 0 && (
              <Text fontSize="xs" color="red.500" fontWeight={700} className="tabular">
                {failed} con fallo
              </Text>
            )}
          </HStack>
        )}
        <HStack spacing="2px" h="6px" rounded="full" overflow="hidden" bg="bg.subtle">
          {applied > 0 && <Box h="full" w={pct(applied)} bg="green.400" />}
          {failed > 0 && <Box h="full" w={pct(failed)} bg="red.400" />}
          {pending > 0 && <Box h="full" w={pct(pending)} bg="gray.300" _dark={{ bg: "gray.600" }} />}
          {other > 0 && <Box h="full" w={pct(other)} bg="gray.200" _dark={{ bg: "gray.700" }} />}
        </HStack>
      </Box>
    </Tooltip>
  );
}
