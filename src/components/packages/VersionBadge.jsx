import { Badge } from "@chakra-ui/react";
import { CustomBadge } from "../common/StatusBadge";

/** «General» o «Personalizada · Cliente» según el dueño de la versión del artefacto. */
export default function VersionBadge({ artifact }) {
  return artifact.ownerClientId ? (
    <CustomBadge clientName={artifact.ownerClientName} />
  ) : (
    <Badge colorScheme="gray" variant="outline" fontSize="xs">
      General
    </Badge>
  );
}
