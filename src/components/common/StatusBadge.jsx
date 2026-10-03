import { Badge, Box, HStack, Text } from "@chakra-ui/react";
import {
  ArtifactExecution,
  ArtifactType,
  ChangeType,
  RequestStatus,
  TargetStatus,
} from "../../helpers/deploymentStatus";

function Dot({ color }) {
  return <Box w="7px" h="7px" rounded="full" bg={`${color}.400`} flexShrink={0} />;
}

/** Estado general de una solicitud. */
export function RequestStatusBadge({ status, size = "md" }) {
  const info = RequestStatus[status] ?? { label: status, color: "gray" };
  return (
    <Badge colorScheme={info.color} variant="subtle" fontSize={size === "lg" ? "sm" : "xs"} px={size === "lg" ? 3 : 2} py={size === "lg" ? 1 : 0.5}>
      <HStack spacing={1.5}>
        <Dot color={info.color} />
        <span>{info.label}</span>
      </HStack>
    </Badge>
  );
}

/** Estado de un cliente destino. */
export function TargetStatusBadge({ status }) {
  const info = TargetStatus[status] ?? { label: status, color: "gray" };
  return (
    <Badge colorScheme={info.color} variant="subtle">
      <HStack spacing={1.5}>
        <Dot color={info.color} />
        <span>{info.label}</span>
      </HStack>
    </Badge>
  );
}

/** Resultado de un artefacto en un cliente. */
export function ExecutionBadge({ status }) {
  const info = ArtifactExecution[status] ?? { label: status, color: "gray" };
  return (
    <Badge colorScheme={info.color} variant="outline" fontSize="xs">
      {info.label}
    </Badge>
  );
}

/** Tipo de cambio de un artefacto en el paquete; «Nuevo» resalta lo que entró al catálogo. */
export function ChangeTypeBadge({ changeType }) {
  const info = ChangeType[changeType] ?? { label: changeType, color: "gray" };
  return (
    <Badge colorScheme={info.color} variant={changeType === "Added" ? "solid" : "subtle"}>
      {info.label}
    </Badge>
  );
}

export function ArtifactTypeLabel({ type }) {
  return (
    <Text as="span" fontSize="sm" color="text.muted">
      {ArtifactType[type] ?? type}
    </Text>
  );
}

/** Actualización personalizada: va a un solo cliente y no cuenta como versión del producto. */
export function CustomBadge({ clientName, size = "sm" }) {
  return (
    <Badge colorScheme="purple" variant="subtle" fontSize={size === "sm" ? "xs" : "sm"} title="No cambia la versión vigente ni marca desactualizados a otros clientes">
      Personalizada{clientName ? ` · ${clientName}` : ""}
    </Badge>
  );
}
