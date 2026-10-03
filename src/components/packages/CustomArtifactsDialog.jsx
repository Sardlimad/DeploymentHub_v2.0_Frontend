import { useRef } from "react";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import Mono from "../common/Mono";
import { ArtifactTypeLabel, CustomBadge } from "../common/StatusBadge";
import { customClientNames, customEffectText } from "../../helpers/customArtifacts";

/**
 * Alerta (no bloquea) al incluir artefactos personalizados de otro cliente.
 * Permite agregarlos igual o agregar solo los demás.
 */
export default function CustomArtifactsDialog({ isOpen, conflicts, total, packageClientName, onAddAll, onAddOthers, onCancel }) {
  const cancelRef = useRef();
  const others = total - conflicts.length;

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onCancel} isCentered size="lg">
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg">
            {conflicts.length === 1 ? "Elegiste la versión personalizada de otro cliente" : `${conflicts.length} artefactos son versiones de otros clientes`}
          </AlertDialogHeader>
          <AlertDialogBody>
            <Stack spacing={3}>
              <Box maxH="240px" overflowY="auto" borderWidth="1px" borderColor="border.subtle" rounded="md">
                {conflicts.slice(0, 50).map((item) => (
                  <HStack key={item.key} justify="space-between" px={3} py={2} borderBottomWidth="1px" borderColor="border.subtle">
                    <Box minW={0}>
                      <Mono fontWeight={600} noOfLines={1}>
                        {item.code}
                      </Mono>
                      <ArtifactTypeLabel type={item.type} />
                    </Box>
                    <CustomBadge clientName={customClientNames(item)} />
                  </HStack>
                ))}
                {conflicts.length > 50 && (
                  <Text fontSize="xs" color="text.muted" p={2}>
                    y {conflicts.length - 50} más
                  </Text>
                )}
              </Box>
              <Text fontSize="sm">{customEffectText(packageClientName)}</Text>
            </Stack>
          </AlertDialogBody>
          <AlertDialogFooter gap={2} flexWrap="wrap">
            <Button ref={cancelRef} variant="ghost" colorScheme="gray" onClick={onCancel}>
              Volver
            </Button>
            {others > 0 && (
              <Button variant="outline" onClick={onAddOthers}>
                Agregar solo los otros {others}
              </Button>
            )}
            <Button colorScheme="purple" onClick={onAddAll}>
              Agregar igualmente
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
