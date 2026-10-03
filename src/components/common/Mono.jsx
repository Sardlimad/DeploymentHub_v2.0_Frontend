import { Text } from "@chakra-ui/react";

/** Identificadores técnicos (DR-000012, códigos de artefacto, commits) en monoespaciada. */
export default function Mono({ children, ...props }) {
  return (
    <Text as="span" fontFamily="mono" fontSize="0.92em" className="tabular" {...props}>
      {children}
    </Text>
  );
}
