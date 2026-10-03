import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FiArrowDown, FiArrowUp, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import Mono from "../common/Mono";
import { ArtifactTypeLabel, ChangeTypeBadge, CustomBadge } from "../common/StatusBadge";
import CustomArtifactsDialog from "./CustomArtifactsDialog";
import { belongsTo, customConflicts, rankVersions, versionKey } from "../../helpers/customArtifacts";
import { listProductArtifacts } from "../../services/catalog";
import { ArtifactType } from "../../helpers/deploymentStatus";
import { pluralize } from "../../helpers/format";
import ScriptImporter from "./ScriptImporter";
import VersionBadge from "./VersionBadge";

const LIST_PAGE = 50;

const normalize = (code) => code.trim().toUpperCase();
let keySeq = 0;
const nextKey = () => `a${++keySeq}`;

/**
 * Arma la lista ordenada de artefactos de un paquete. Busca en el catálogo del producto;
 * lo que no existe se agrega como «Nuevo» y entra al catálogo al crear el paquete.
 */
export default function ArtifactEditor({ productId, items, onChange, packageClientId, packageClientName }) {
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({ type: "StoredProcedure", code: "", path: "" });
  const [listLimit, setListLimit] = useState(LIST_PAGE);
  const [pendingAdd, setPendingAdd] = useState(null); // { items, conflicts }

  // RN-11: avisa (sin impedirlo) si se incluyen artefactos personalizados de otro cliente.
  const requestAdd = (added) => {
    const conflicts = customConflicts(added, packageClientId);
    if (conflicts.length === 0) onChange([...items, ...added]);
    else setPendingAdd({ items: added, conflicts });
  };

  useEffect(() => {
    if (!productId) return;
    setLoadingCatalog(true);
    listProductArtifacts(productId)
      .then(setCatalog)
      .catch(() => setCatalog([]))
      .finally(() => setLoadingCatalog(false));
  }, [productId]);

  // Un paquete lleva una sola versión de cada tipo + código: lo ya incluido no se vuelve a ofrecer.
  const usedKeys = new Set(items.map((i) => versionKey(i.type, i.code)));
  const results = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return [];
    const matching = catalog
      .filter((a) => a.isActive && !usedKeys.has(versionKey(a.type, a.code)))
      .filter((a) => `${a.code} ${a.name} ${a.path ?? ""}`.toLowerCase().includes(text));
    return rankVersions(matching, packageClientId).slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, catalog, items, packageClientId]);

  const addFromCatalog = (artifact) => {
    requestAdd([
      {
        key: nextKey(),
        productArtifactId: artifact.id,
        type: artifact.type,
        code: artifact.code,
        path: artifact.path,
        isNew: false,
        ownerClientId: artifact.ownerClientId ?? null,
        ownerClientName: artifact.ownerClientName ?? null,
      },
    ]);
    setSearch("");
  };

  // Por código se usa la versión del destinatario (Modificado); si no existe, entra como nueva para él.
  const draftVersions = catalog.filter((a) => a.type === draft.type && a.code === normalize(draft.code));
  const draftMatch = draftVersions.find((a) => belongsTo(a, packageClientId));
  const draftOthers = draftVersions.filter((a) => !belongsTo(a, packageClientId));
  const draftDuplicated = items.some((i) => i.type === draft.type && normalize(i.code) === normalize(draft.code));

  const addDraft = () => {
    if (!draft.code.trim() || draftDuplicated) return;
    if (draftMatch) {
      addFromCatalog(draftMatch);
    } else {
      onChange([
        ...items,
        {
          key: nextKey(),
          type: draft.type,
          code: normalize(draft.code),
          path: draft.path.trim(),
          isNew: true,
          ownerClientId: packageClientId || null,
          ownerClientName: packageClientId ? packageClientName : null,
        },
      ]);
    }
    setDraft({ ...draft, code: "", path: "" });
  };

  const move = (index, delta) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };

  return (
    <Stack spacing={4}>
      <ScriptImporter
        catalog={catalog}
        existingItems={items}
        onAdd={requestAdd}
        packageClientId={packageClientId}
        packageClientName={packageClientName}
      />

      <CustomArtifactsDialog
        isOpen={!!pendingAdd}
        conflicts={pendingAdd?.conflicts ?? []}
        total={pendingAdd?.items.length ?? 0}
        packageClientName={packageClientName}
        onCancel={() => setPendingAdd(null)}
        onAddAll={() => {
          onChange([...items, ...pendingAdd.items]);
          setPendingAdd(null);
        }}
        onAddOthers={() => {
          onChange([...items, ...pendingAdd.items.filter((i) => !pendingAdd.conflicts.includes(i))]);
          setPendingAdd(null);
        }}
      />

      <Box>
        <FormLabel fontSize="sm" mb={1}>
          Buscar en el catálogo del producto
        </FormLabel>
        <InputGroup>
          <InputLeftElement pointerEvents="none">{loadingCatalog ? <Spinner size="xs" /> : <FiSearch />}</InputLeftElement>
          <Input
            id="artifact-search"
            placeholder="Código, nombre o ruta (ej: usp_Factura)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        {search.trim() && (
          <Box borderWidth="1px" borderColor="border.subtle" rounded="md" mt={1} maxH="240px" overflowY="auto">
            {results.length === 0 ? (
              <Text fontSize="sm" color="text.muted" p={3}>
                No está en el catálogo. Agrégalo abajo como artefacto nuevo.
              </Text>
            ) : (
              results.map((a) => (
                <HStack
                  key={a.id}
                  as="button"
                  type="button"
                  w="full"
                  justify="space-between"
                  px={3}
                  py={2}
                  _hover={{ bg: "bg.hover" }}
                  onClick={() => addFromCatalog(a)}
                  textAlign="left"
                >
                  <Box minW={0}>
                    <Mono fontWeight={600}>{a.code}</Mono>
                    <Text fontSize="xs" color="text.muted" noOfLines={1}>
                      {ArtifactType[a.type]} {a.path ? `· ${a.path}` : ""}
                    </Text>
                    <VersionBadge artifact={a} />
                  </Box>
                  <FiPlus />
                </HStack>
              ))
            )}
          </Box>
        )}
      </Box>

      <Box borderWidth="1px" borderStyle="dashed" borderColor="border.subtle" rounded="md" p={3}>
        <Text fontSize="sm" fontWeight={700} mb={2}>
          Artefacto que no está en el catálogo
        </Text>
        <Flex gap={2} wrap="wrap" align="end">
          <FormControl maxW={{ base: "full", md: "220px" }}>
            <FormLabel fontSize="xs" mb={1}>
              Tipo
            </FormLabel>
            <Select id="new-artifact-type" size="sm" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              {Object.entries(ArtifactType).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl flex="1" minW="180px">
            <FormLabel fontSize="xs" mb={1}>
              Código
            </FormLabel>
            <Input
              id="new-artifact-code"
              size="sm"
              fontFamily="mono"
              placeholder="usp_Factura_Anular"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDraft())}
            />
          </FormControl>
          <FormControl flex="2" minW="200px">
            <FormLabel fontSize="xs" mb={1}>
              Ruta en el repositorio (opcional)
            </FormLabel>
            <Input
              id="new-artifact-path"
              size="sm"
              fontFamily="mono"
              placeholder="Scripts/04.PROCEDIMIENTOS/usp_Factura_Anular.sql"
              value={draft.path}
              onChange={(e) => setDraft({ ...draft, path: e.target.value })}
            />
          </FormControl>
          <Button size="sm" leftIcon={<FiPlus />} onClick={addDraft} isDisabled={!draft.code.trim() || draftDuplicated}>
            Agregar
          </Button>
        </Flex>
        {draft.code.trim() && (
          <Text fontSize="xs" mt={2} color={draftDuplicated ? "red.500" : draftMatch ? "text.muted" : "green.600"}>
            {draftDuplicated
              ? "Ya está en el paquete."
              : draftMatch
              ? `Ya existe ${packageClientId ? `la versión de ${packageClientName}` : "la versión general"}: se agregará como modificado.`
              : `No existe ${packageClientId ? `la versión de ${packageClientName}` : "la versión general"}: entrará como «Nuevo» al crear el paquete.`}
            {!draftDuplicated && !draftMatch && draftOthers.length > 0 &&
              ` (Con este nombre ya hay: ${draftOthers.map((a) => a.ownerClientName ?? "versión general").join(", ")}.)`}
          </Text>
        )}
      </Box>

      <Box>
        <HStack justify="space-between" mb={2}>
          <Text fontWeight={700} fontSize="sm">
            Orden de ejecución
          </Text>
          <HStack spacing={3}>
            <Text fontSize="xs" color="text.muted">
              {pluralize(items.length, "artefacto")} · {pluralize(items.filter((i) => i.isNew).length, "nuevo")}
            </Text>
            {items.length > 1 && (
              <Button size="xs" variant="ghost" colorScheme="red" onClick={() => onChange([])}>
                Quitar todos
              </Button>
            )}
          </HStack>
        </HStack>
        {items.length === 0 ? (
          <Text fontSize="sm" color="text.muted" py={4} textAlign="center" borderWidth="1px" borderColor="border.subtle" rounded="md">
            Todavía no hay artefactos. Busca en el catálogo o agrega uno nuevo.
          </Text>
        ) : (
          <Stack spacing={1.5}>
            {items.slice(0, listLimit).map((item, index) => (
              <HStack
                key={item.key}
                borderWidth="1px"
                borderColor={item.isNew ? "green.300" : "border.subtle"}
                bg={item.isNew ? "green.50" : "bg.surface"}
                _dark={item.isNew ? { bg: "rgba(72,187,120,0.08)", borderColor: "green.700" } : undefined}
                rounded="md"
                px={3}
                py={2}
                spacing={3}
              >
                <Text fontSize="sm" color="text.muted" w="24px" className="tabular">
                  {index + 1}.
                </Text>
                <Box flex="1" minW={0}>
                  <HStack spacing={2}>
                    <Mono fontWeight={600} noOfLines={1}>
                      {item.code}
                    </Mono>
                    <ChangeTypeBadge changeType={item.isNew ? "Added" : "Modified"} />
                    {item.ownerClientId && <CustomBadge clientName={item.ownerClientName} />}
                  </HStack>
                  <HStack spacing={2}>
                    <ArtifactTypeLabel type={item.type} />
                    {item.path && (
                      <Mono fontSize="xs" color="text.muted" noOfLines={1}>
                        {item.path}
                      </Mono>
                    )}
                  </HStack>
                </Box>
                <IconButton size="xs" variant="ghost" colorScheme="gray" aria-label="Subir" title="Subir" icon={<FiArrowUp />} isDisabled={index === 0} onClick={() => move(index, -1)} />
                <IconButton size="xs" variant="ghost" colorScheme="gray" aria-label="Bajar" title="Bajar" icon={<FiArrowDown />} isDisabled={index === items.length - 1} onClick={() => move(index, 1)} />
                <IconButton
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  aria-label="Quitar"
                  title="Quitar"
                  icon={<FiTrash2 />}
                  onClick={() => onChange(items.filter((i) => i.key !== item.key))}
                />
              </HStack>
            ))}
            {items.length > listLimit && (
              <Button size="sm" variant="ghost" onClick={() => setListLimit((n) => n + LIST_PAGE * 4)}>
                Mostrar más ({items.length - listLimit} restantes)
              </Button>
            )}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
