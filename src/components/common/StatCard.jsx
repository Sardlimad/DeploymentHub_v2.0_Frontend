import { Box, HStack, Text } from "@chakra-ui/react";

/**
 * Métrica del panel. Si recibe onClick funciona como acceso directo a la lista filtrada.
 * tone: "neutral" | "warning" | "danger" | "success" | "brand"
 */
export default function StatCard({ label, value, hint, icon, tone = "neutral", onClick }) {
  const accent = {
    neutral: "gray.400",
    warning: "orange.400",
    danger: "red.400",
    success: "green.400",
    brand: "brand.500",
  }[tone];

  const highlighted = tone !== "neutral" && Number(value) > 0;

  return (
    <Box
      as={onClick ? "button" : "div"}
      onClick={onClick}
      textAlign="left"
      w="full"
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.subtle"
      rounded="lg"
      p={5}
      position="relative"
      overflow="hidden"
      transition="border-color 0.15s ease, transform 0.15s ease"
      _hover={onClick ? { borderColor: accent, transform: "translateY(-1px)" } : undefined}
      _focusVisible={{ outline: "2px solid", outlineColor: "brand.400", outlineOffset: "2px" }}
    >
      <Box position="absolute" left={0} top={0} bottom={0} w="3px" bg={highlighted ? accent : "transparent"} />
      <HStack justify="space-between" align="start">
        <Text fontSize="sm" color="text.muted" fontWeight={600}>
          {label}
        </Text>
        {icon && (
          <Box color={highlighted ? accent : "text.muted"} fontSize="lg">
            {icon}
          </Box>
        )}
      </HStack>
      <Text fontSize="3xl" fontWeight={800} lineHeight="1.1" mt={2} className="tabular">
        {value}
      </Text>
      {hint && (
        <Text fontSize="xs" color="text.muted" mt={1}>
          {hint}
        </Text>
      )}
    </Box>
  );
}
