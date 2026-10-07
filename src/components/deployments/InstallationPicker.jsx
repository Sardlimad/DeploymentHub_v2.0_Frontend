import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  Input,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import Mono from "../common/Mono";
import { EmptyBlock } from "../common/DataState";
import { formatDate } from "../../helpers/format";

/**
 * Selector de clientes destino (instalaciones de un producto) con atajos para
 * elegir a los desactualizados. Se usa en el asistente y al agregar clientes a un borrador.
 */
export default function InstallationPicker({ installations, selected, onChange, excludeIds = [], warnings = {}, dataGuia }) {
  const [environment, setEnvironment] = useState("");
  const [search, setSearch] = useState("");

  const available = useMemo(
    () => installations.filter((i) => i.isActive && !excludeIds.includes(i.id)),
    [installations, excludeIds]
  );
  const environments = useMemo(() => [...new Set(available.map((i) => i.environmentCode))].sort(), [available]);

  const visible = available.filter(
    (i) =>
      (!environment || i.environmentCode === environment) &&
      (!search || `${i.clientName} ${i.clientCode}`.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.includes(i.id));
  const outdatedVisible = visible.filter((i) => i.isOutdated || !i.currentPackageId);

  if (available.length === 0) {
    return (
      <EmptyBlock
        title="Este producto no tiene clientes disponibles"
        description="Asigna el producto a los clientes desde Catálogo › Clientes; cada cliente se registra en un ambiente."
      />
    );
  }

  return (
    <Stack spacing={3}>
      <Flex gap={2} wrap="wrap">
        <Input
          id="picker-search"
          size="sm"
          maxW="260px"
          placeholder="Buscar cliente"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select id="picker-env" size="sm" maxW="180px" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
          <option value="">Todos los ambientes</option>
          {environments.map((env) => (
            <option key={env} value={env}>
              {env}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange(
              allVisibleSelected
                ? selected.filter((id) => !visible.some((i) => i.id === id))
                : [...new Set([...selected, ...visible.map((i) => i.id)])]
            )
          }
        >
          {allVisibleSelected ? "Quitar todos" : "Elegir todos"}
        </Button>
        {outdatedVisible.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            colorScheme="orange"
            onClick={() => onChange([...new Set([...selected, ...outdatedVisible.map((i) => i.id)])])}
          >
            Elegir desactualizados ({outdatedVisible.length})
          </Button>
        )}
      </Flex>

      <Stack spacing={1.5} maxH="420px" overflowY="auto" pr={1} data-guia={dataGuia}>
        {visible.map((i) => {
          const checked = selected.includes(i.id);
          return (
            <Box
              key={i.id}
              as="label"
              htmlFor={`inst-${i.id}`}
              display="block"
              borderWidth="1px"
              borderColor={checked ? "brand.400" : "border.subtle"}
              bg={checked ? "accent.subtle" : "bg.surface"}
              rounded="md"
              px={3}
              py={2.5}
              cursor="pointer"
              _hover={{ borderColor: "brand.300" }}
            >
              <HStack justify="space-between" align="center" gap={3}>
                <HStack spacing={3} minW={0}>
                  <Checkbox id={`inst-${i.id}`} isChecked={checked} onChange={() => toggle(i.id)} />
                  <Box minW={0}>
                    <Text fontWeight={600} noOfLines={1}>
                      {i.clientName}
                    </Text>
                    <Text fontSize="xs" color="text.muted" noOfLines={1}>
                      Tiene: {i.currentPackageDescription ?? "ningún paquete registrado"}
                      {i.currentPackageAppliedAt && ` · ${formatDate(i.currentPackageAppliedAt)}`}
                    </Text>
                    {warnings[i.clientId] && (
                      <Text fontSize="xs" color="orange.600" noOfLines={2}>
                        {warnings[i.clientId]}
                      </Text>
                    )}
                  </Box>
                </HStack>
                <HStack spacing={2} flexShrink={0}>
                  {i.pendingRequestNumber && (
                    <Tooltip label="Ya tiene otra solicitud enviada sin aplicar">
                      <Badge colorScheme="purple" variant="subtle">
                        Pendiente DR-{String(i.pendingRequestNumber).padStart(6, "0")}
                      </Badge>
                    </Tooltip>
                  )}
                  {i.isOutdated && (
                    <Badge colorScheme="orange" variant="subtle">
                      Desactualizado
                    </Badge>
                  )}
                  <Mono fontSize="xs" color="text.muted">
                    {i.environmentCode}
                  </Mono>
                </HStack>
              </HStack>
            </Box>
          );
        })}
        {visible.length === 0 && (
          <Text fontSize="sm" color="text.muted" py={4} textAlign="center">
            Ningún cliente coincide con el filtro.
          </Text>
        )}
      </Stack>

      <Text fontSize="sm" color="text.muted" className="tabular">
        {selected.length} {selected.length === 1 ? "cliente elegido" : "clientes elegidos"}
      </Text>
    </Stack>
  );
}
