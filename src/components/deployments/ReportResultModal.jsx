import { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  ButtonGroup,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import Mono from "../common/Mono";
import { ChangeTypeBadge } from "../common/StatusBadge";
import { targetActionLabel } from "../../helpers/deploymentStatus";

const RESULT_OPTIONS = [
  { value: "Applied", label: "Aplicado", color: "green" },
  { value: "Failed", label: "Falló", color: "red" },
  { value: "Skipped", label: "Omitido", color: "gray" },
];

/**
 * Cambia el estado de un cliente destino. Para «Aplicado» y «Fallido» permite detallar
 * el resultado de cada artefacto (un script puede fallar en un cliente y en otro no).
 */
export default function ReportResultModal({ isOpen, onClose, target, toStatus, artifacts = [], onSubmit }) {
  const withResults = toStatus === "Applied" || toStatus === "Failed";
  const [comment, setComment] = useState("");
  const [results, setResults] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setComment("");
    setSearch("");
    // Aplicado: todo aplicado por defecto. Fallido: sin detalle hasta que el usuario marque cuál falló.
    setResults(
      Object.fromEntries(
        artifacts.map((a) => [a.id, { status: toStatus === "Applied" ? "Applied" : null, message: "" }])
      )
    );
  }, [isOpen, toStatus, artifacts]);

  const setResult = (id, change) => setResults((prev) => ({ ...prev, [id]: { ...prev[id], ...change } }));

  const commentRequired = toStatus === "Failed";
  const hasFailedArtifact = Object.values(results).some((r) => r.status === "Failed");
  const invalidApplied = toStatus === "Applied" && hasFailedArtifact;

  const submit = async () => {
    setSaving(true);
    try {
      const artifactResults = withResults
        ? Object.entries(results)
            // «Aplicado» es lo que el servidor asume sin detalle: solo se envía lo que cambia.
            .filter(([, r]) => r.status && !(toStatus === "Applied" && r.status === "Applied"))
            .map(([packageArtifactId, r]) => ({
              packageArtifactId,
              status: r.status,
              message: r.message?.trim() || null,
            }))
        : undefined;
      await onSubmit({ status: toStatus, comment: comment.trim() || null, artifactResults });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!target) return null;

  // Con paquetes de cientos de scripts se muestran primero los marcados y se busca el resto.
  const LIMIT = 30;
  const defaultStatus = toStatus === "Applied" ? "Applied" : null;
  const marked = artifacts.filter((a) => (results[a.id]?.status ?? defaultStatus) !== defaultStatus);
  const text = search.trim().toLowerCase();
  const matching = artifacts.filter((a) => !marked.includes(a) && (!text || a.code.toLowerCase().includes(text)));
  const visibleArtifacts = [...marked, ...matching.slice(0, Math.max(LIMIT - marked.length, 0))];
  const hiddenCount = artifacts.length - visibleArtifacts.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={withResults ? "3xl" : "lg"} scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {targetActionLabel(target.status, toStatus)}
          <Text fontSize="sm" fontWeight={500} color="text.muted">
            {target.clientName} · <Mono>{target.environmentCode}</Mono>
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={5}>
            {withResults && artifacts.length > 0 && (
              <Box>
                <Text fontWeight={700} fontSize="sm" mb={1}>
                  Resultado por artefacto
                </Text>
                <Text fontSize="sm" color="text.muted" mb={3}>
                  {toStatus === "Applied"
                    ? "Todos quedan como aplicados. Marca «Omitido» si alguno no se ejecutó en este cliente."
                    : "Marca cuál falló y pega el error; así se sabe qué reintentar."}
                </Text>
                {artifacts.length > LIMIT && (
                  <Input
                    id="result-search"
                    size="sm"
                    mb={3}
                    placeholder={`Buscar entre ${artifacts.length} artefactos (ej: usp_Factura)`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                )}
                <Stack spacing={2}>
                  {visibleArtifacts.map((a) => {
                    const r = results[a.id] ?? {};
                    return (
                      <Box key={a.id} borderWidth="1px" borderColor="border.subtle" rounded="md" p={3}>
                        <HStack justify="space-between" align="start" wrap="wrap" gap={2}>
                          <Box minW={0}>
                            <HStack spacing={2}>
                              <Text fontSize="xs" color="text.muted" className="tabular">
                                {a.executionOrder}.
                              </Text>
                              <Mono fontWeight={600}>{a.code}</Mono>
                              {a.isNew && <ChangeTypeBadge changeType="Added" />}
                            </HStack>
                          </Box>
                          <ButtonGroup size="xs" isAttached variant="outline">
                            {RESULT_OPTIONS.filter((o) => toStatus !== "Applied" || o.value !== "Failed").map((o) => (
                              <Button
                                key={o.value}
                                colorScheme={r.status === o.value ? o.color : "gray"}
                                variant={r.status === o.value ? "solid" : "outline"}
                                onClick={() => setResult(a.id, { status: r.status === o.value ? null : o.value })}
                              >
                                {o.label}
                              </Button>
                            ))}
                          </ButtonGroup>
                        </HStack>
                        {r.status === "Failed" && (
                          <Input
                            id={`artifact-error-${a.id}`}
                            mt={2}
                            size="sm"
                            placeholder="Mensaje de error (ej: Invalid column name 'MotivoId')"
                            value={r.message}
                            onChange={(e) => setResult(a.id, { message: e.target.value })}
                          />
                        )}
                      </Box>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <Text fontSize="xs" color="text.muted" textAlign="center">
                      {hiddenCount} artefactos más {toStatus === "Applied" ? "quedan como aplicados" : "sin marcar"}. Búscalos por código para cambiarlos.
                    </Text>
                  )}
                </Stack>
              </Box>
            )}

            {invalidApplied && (
              <Alert status="warning" rounded="md">
                <AlertIcon />
                Hay artefactos marcados como fallidos: el cliente no puede quedar como aplicado.
              </Alert>
            )}

            <FormControl isRequired={commentRequired}>
              <FormLabel fontSize="sm">{commentRequired ? "Motivo del fallo" : "Comentario"}</FormLabel>
              <Textarea
                id="target-comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={commentRequired ? "Qué pasó y qué se necesita para reintentar" : "Opcional"}
              />
              {toStatus === "RolledBack" && (
                <FormHelperText>El cliente vuelve a la versión que tenía antes de este paquete.</FormHelperText>
              )}
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" colorScheme="gray" onClick={onClose}>
            Volver
          </Button>
          <Button
            colorScheme={toStatus === "Failed" || toStatus === "RolledBack" ? "red" : toStatus === "Applied" ? "green" : "brand"}
            onClick={submit}
            isLoading={saving}
            data-guia="resultado.confirmar"
            isDisabled={(commentRequired && !comment.trim()) || invalidApplied}
          >
            {targetActionLabel(target.status, toStatus)}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
