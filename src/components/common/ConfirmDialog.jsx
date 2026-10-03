import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  FormControl,
  FormLabel,
  Textarea,
} from "@chakra-ui/react";

/**
 * Confirmación para acciones que no se deshacen fácilmente.
 * Con `withReason` pide un texto (ej: motivo de cancelación) y lo pasa a onConfirm.
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirmar",
  colorScheme = "red",
  withReason = false,
  reasonLabel = "Motivo",
  reasonRequired = false,
}) {
  const cancelRef = useRef();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(reason.trim() || undefined);
      setReason("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose} isCentered>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg">{title}</AlertDialogHeader>
          <AlertDialogBody>
            {body}
            {withReason && (
              <FormControl mt={4} isRequired={reasonRequired}>
                <FormLabel fontSize="sm">{reasonLabel}</FormLabel>
                <Textarea id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
              </FormControl>
            )}
          </AlertDialogBody>
          <AlertDialogFooter gap={2}>
            <Button ref={cancelRef} variant="ghost" colorScheme="gray" onClick={onClose}>
              Volver
            </Button>
            <Button
              colorScheme={colorScheme}
              onClick={handleConfirm}
              isLoading={loading}
              isDisabled={reasonRequired && !reason.trim()}
            >
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
