import { Box, Button, Skeleton, Stack, Text, VStack } from "@chakra-ui/react";
import { FiAlertTriangle, FiInbox } from "react-icons/fi";

/** Filas de carga con la misma altura que el contenido real (evita saltos de la página). */
export function LoadingRows({ rows = 5, height = "44px" }) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={height} rounded="md" />
      ))}
    </Stack>
  );
}

/** Estado vacío con una acción concreta para salir de él. */
export function EmptyBlock({ title, description, actionLabel, onAction, icon = <FiInbox /> }) {
  return (
    <VStack spacing={3} py={12} px={6} textAlign="center">
      <Box fontSize="3xl" color="text.muted">
        {icon}
      </Box>
      <Text fontWeight={700} fontSize="lg">
        {title}
      </Text>
      {description && (
        <Text color="text.muted" maxW="52ch">
          {description}
        </Text>
      )}
      {actionLabel && (
        <Button onClick={onAction} mt={2}>
          {actionLabel}
        </Button>
      )}
    </VStack>
  );
}

/** Error al cargar, con reintento. */
export function ErrorBlock({ message, onRetry }) {
  return (
    <VStack spacing={3} py={10} textAlign="center">
      <Box fontSize="3xl" color="red.400">
        <FiAlertTriangle />
      </Box>
      <Text fontWeight={700}>No se pudo cargar la información</Text>
      <Text color="text.muted" maxW="52ch">
        {message}
      </Text>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </VStack>
  );
}
