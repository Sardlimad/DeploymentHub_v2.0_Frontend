import { Fragment, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Checkbox,
  Collapse,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Tab,
  Table,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
  useToast,
  Wrap,
} from "@chakra-ui/react";
import {
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiChevronRight,
  FiMoreHorizontal,
  FiPlay,
  FiPlus,
  FiRotateCcw,
  FiSend,
  FiThumbsUp,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import Layout from "../components/Layout";
import PageHeader from "../components/common/PageHeader";
import Mono from "../components/common/Mono";
import TargetProgress from "../components/common/TargetProgress";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { ArtifactTypeLabel, ChangeTypeBadge, CustomBadge, ExecutionBadge, RequestStatusBadge, TargetStatusBadge } from "../components/common/StatusBadge";
import { EmptyBlock, ErrorBlock, LoadingRows } from "../components/common/DataState";
import ReportResultModal from "../components/deployments/ReportResultModal";
import { confirmarKrud } from "../integraciones/krud/eventos";
import InstallationPicker from "../components/deployments/InstallationPicker";
import { AuthContext } from "../context/AuthContext";
import {
  addTargets,
  approveDeploymentRequest,
  cancelDeploymentRequest,
  changeTargetStatus,
  getDeploymentRequest,
  removeTarget,
  submitDeploymentRequest,
} from "../services/deploymentRequests";
import { getInstallations } from "../services/installations";
import { apiErrorMessage } from "../services/api";
import { useRealtimeRefresh } from "../hooks/useDeploymentsRealtime";
import { isPrimaryTargetAction, TargetStatus, targetActionLabel, targetButtonLabel } from "../helpers/deploymentStatus";
import { dateWithPerson, formatDateTime, timeAgo } from "../helpers/format";

const ACTION_ICONS = {
  InProgress: <FiPlay />,
  Applied: <FiCheck />,
  Failed: <FiX />,
  Scheduled: <FiRotateCcw />,
};

const ARTIFACT_PAGE = 100;

const TARGET_FILTERS = [
  { key: "all", label: "Todos", match: () => true },
  { key: "pending", label: "Por aplicar", match: (s) => ["Pending", "Scheduled", "InProgress"].includes(s) },
  { key: "failed", label: "Con fallo", match: (s) => ["Failed", "RolledBack"].includes(s) },
  { key: "applied", label: "Aplicados", match: (s) => s === "Applied" },
];

function SummaryItem({ label, children }) {
  return (
    <Box minW={0}>
      <Text fontSize="xs" color="text.muted" fontWeight={600}>
        {label}
      </Text>
      <Box fontWeight={600} mt={0.5}>
        {children}
      </Box>
    </Box>
  );
}

function TargetDetails({ target, artifacts }) {
  const byArtifact = Object.fromEntries(target.artifactResults.map((r) => [r.packageArtifactId, r]));
  // Con cientos de scripts solo se listan los que no quedaron aplicados (fallidos, omitidos o sin dato).
  const appliedCount = artifacts.filter((a) => byArtifact[a.id]?.status === "Applied").length;
  const notApplied = artifacts.filter((a) => byArtifact[a.id]?.status !== "Applied");
  return (
    <Grid templateColumns={{ base: "1fr", lg: "3fr 2fr" }} gap={6} py={4} px={{ base: 2, md: 6 }} bg="bg.subtle">
      <Box minW={0}>
        <Text fontSize="sm" fontWeight={700} mb={2}>
          Resultado por artefacto
        </Text>
        {target.artifactResults.length === 0 ? (
          <Text fontSize="sm" color="text.muted">
            Aún no se reportan resultados para este cliente.
          </Text>
        ) : (
          <Stack spacing={1.5}>
            {appliedCount > 0 && (
              <Text fontSize="sm" color="green.600" fontWeight={600}>
                {appliedCount} de {artifacts.length} aplicados
              </Text>
            )}
            {notApplied.length === 0 && (
              <Text fontSize="sm" color="text.muted">
                Ningún artefacto falló ni se omitió.
              </Text>
            )}
            {notApplied.map((a) => {
              const r = byArtifact[a.id];
              return (
                <HStack key={a.id} justify="space-between" align="start" spacing={3}>
                  <Box minW={0}>
                    <Mono fontSize="sm">{a.code}</Mono>
                    {r?.message && (
                      <Text fontSize="xs" color="red.500" noOfLines={2}>
                        {r.message}
                      </Text>
                    )}
                  </Box>
                  {r ? <ExecutionBadge status={r.status} /> : <Text fontSize="xs" color="text.muted">sin dato</Text>}
                </HStack>
              );
            })}
          </Stack>
        )}
      </Box>
      <Box minW={0}>
        <Text fontSize="sm" fontWeight={700} mb={2}>
          Historial
        </Text>
        {target.history.length === 0 ? (
          <Text fontSize="sm" color="text.muted">
            Sin cambios todavía.
          </Text>
        ) : (
          <Stack spacing={3} borderLeftWidth="2px" borderColor="border.subtle" pl={4}>
            {target.history.map((h) => (
              <Box key={`${h.changedAt}-${h.toStatus}`} position="relative">
                <Box
                  position="absolute"
                  left="-21px"
                  top="6px"
                  w="8px"
                  h="8px"
                  rounded="full"
                  bg={`${TargetStatus[h.toStatus]?.color ?? "gray"}.400`}
                />
                <Text fontSize="sm">
                  {TargetStatus[h.fromStatus]?.label} → <b>{TargetStatus[h.toStatus]?.label}</b>
                </Text>
                {h.comment && (
                  <Text fontSize="xs" color="text.muted">
                    {h.comment}
                  </Text>
                )}
                <Text fontSize="xs" color="text.muted">
                  {dateWithPerson(h.changedAt, h.changedByName)}
                </Text>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Grid>
  );
}

function DetailInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasRole } = useContext(AuthContext);
  const [request, setRequest] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState("all");
  const [artifactSearch, setArtifactSearch] = useState("");
  const [artifactLimit, setArtifactLimit] = useState(ARTIFACT_PAGE);
  const [action, setAction] = useState(null); // { target, toStatus }
  const [bulkRunning, setBulkRunning] = useState(false);
  const [installations, setInstallations] = useState([]);
  const [toAdd, setToAdd] = useState([]);
  const cancelDialog = useDisclosure();
  const submitDialog = useDisclosure();
  const addClients = useDisclosure();

  const load = useCallback(async () => {
    try {
      setRequest(await getDeploymentRequest(id));
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, "No se encontró la solicitud."));
    }
  }, [id]);

  useEffect(() => {
    // load() actualiza el estado después del await (carga asíncrona); la regla no lo distingue.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useRealtimeRefresh(load, (event) => event.requestId === id);

  const canDeploy = hasRole("DEVELOPER");
  const canOperate = hasRole("INFRA");
  const isDraft = request?.status === "Draft";
  const isCancelled = request?.status === "Cancelled";
  const artifacts = request?.package?.artifacts ?? [];
  const artifactText = artifactSearch.trim().toLowerCase();
  const filteredArtifacts = artifactText
    ? artifacts.filter((a) => `${a.code} ${a.path ?? ""}`.toLowerCase().includes(artifactText))
    : artifacts;

  const visibleTargets = useMemo(() => {
    const match = TARGET_FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
    return (request?.targets ?? []).filter((t) => match(t.status));
  }, [request, filter]);

  const run = async (fn, successMessage) => {
    try {
      await fn();
      if (successMessage) toast({ title: successMessage, status: "success" });
      await load();
      return true;
    } catch (err) {
      toast({ title: "No se pudo completar", description: apiErrorMessage(err), status: "error", duration: 6000 });
      return false;
    }
  };

  const reportStatus = async (body) => {
    const ok = await run(() => changeTargetStatus(id, action.target.id, body));
    if (ok) {
      toast({ title: `${action.target.clientName}: ${TargetStatus[body.status]?.label}`, status: "success" });
      confirmarKrud("resultado-registrado");
    }
  };

  // Acción masiva: solo se aplica a los clientes elegidos que admiten ese cambio.
  const bulkChange = async (toStatus) => {
    const targets = request.targets.filter((t) => selected.includes(t.id) && t.nextStatuses.includes(toStatus));
    setBulkRunning(true);
    let ok = 0;
    const failures = [];
    for (const t of targets) {
      try {
        await changeTargetStatus(id, t.id, { status: toStatus });
        ok++;
      } catch (err) {
        failures.push(`${t.clientName}: ${apiErrorMessage(err)}`);
      }
    }
    setBulkRunning(false);
    setSelected([]);
    await load();
    toast({
      title: `${ok} de ${targets.length} clientes actualizados`,
      description: failures.join("\n") || undefined,
      status: failures.length ? "warning" : "success",
      duration: failures.length ? 8000 : 3000,
    });
  };

  const openAddClients = async () => {
    try {
      setInstallations(await getInstallations({ productId: request.productId }));
      setToAdd([]);
      addClients.onOpen();
    } catch (err) {
      toast({ title: "No se pudieron cargar los clientes", description: apiErrorMessage(err), status: "error" });
    }
  };

  if (error) {
    return <ErrorBlock message={error} onRetry={load} />;
  }
  if (!request) {
    return <LoadingRows rows={6} height="60px" />;
  }

  const selectedTargets = request.targets.filter((t) => selected.includes(t.id));
  const bulkOptions = ["InProgress", "Applied", "Scheduled"].filter((s) =>
    selectedTargets.some((t) => t.nextStatuses.includes(s))
  );
  const newArtifacts = artifacts.filter((a) => a.isNew).length;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Solicitudes", to: "/deployments" }, { label: request.displayNumber }]}
        title={<Mono fontSize="inherit">{request.displayNumber}</Mono>}
        meta={
          <>
            <RequestStatusBadge status={request.status} size="lg" />
            {request.isCustom && <CustomBadge clientName={request.customClientName} size="md" />}
          </>
        }
        description={request.packageDescription || request.comment || "Solicitud sin paquete todavía"}
        actions={
          <>
            {request.package?.packageUrl && (
              <Button as="a" href={request.package.packageUrl} target="_blank" rel="noopener noreferrer" variant="outline" leftIcon={<FiDownload />}>
                Descargar paquete
              </Button>
            )}
            {isDraft && canDeploy && (
              <>
                <Button variant="outline" leftIcon={<FiPlus />} onClick={openAddClients} isDisabled={!request.packageId}>
                  Agregar clientes
                </Button>
                <Tooltip
                  label={!request.packageId ? "Falta el paquete" : request.targetsTotal === 0 ? "Agrega al menos un cliente" : ""}
                  isDisabled={!!request.packageId && request.targetsTotal > 0}
                >
                  <Button leftIcon={<FiSend />} onClick={submitDialog.onOpen} isDisabled={!request.packageId || request.targetsTotal === 0}>
                    Enviar solicitud
                  </Button>
                </Tooltip>
              </>
            )}
            {request.status === "Pending" && canOperate && (
              <Button leftIcon={<FiThumbsUp />} onClick={() => run(() => approveDeploymentRequest(id), "Solicitud aprobada")}>
                Aprobar
              </Button>
            )}
            {!isCancelled && ["Draft", "Pending", "Approved", "InProgress"].includes(request.status) && canDeploy && (
              <Button variant="ghost" colorScheme="red" onClick={cancelDialog.onOpen}>
                {isDraft ? "Descartar borrador" : "Cancelar"}
              </Button>
            )}
          </>
        }
      />

      {isDraft && (
        <Alert status="info" rounded="md" mb={5}>
          <AlertIcon />
          <AlertDescription fontSize="sm">
            Es un borrador: todavía puedes agregar o quitar clientes. Al enviarla, el paquete queda bloqueado y los clientes pasan a «Pendiente».
          </AlertDescription>
        </Alert>
      )}

      <Card mb={6}>
        <CardBody>
          <Grid templateColumns={{ base: "1fr", md: "minmax(0,2fr) repeat(3, minmax(0,1fr))" }} gap={6} alignItems="center">
            <Box>
              <TargetProgress
                applied={request.targetsApplied}
                failed={request.targetsFailed}
                pending={request.targetsPending}
                total={request.targetsTotal}
              />
            </Box>
            <SummaryItem label="Producto">{request.productName ?? "—"}</SummaryItem>
            <SummaryItem label="Solicitada por">
              <Text noOfLines={1}>{request.createdByName ?? "—"}</Text>
              <Text fontSize="xs" color="text.muted" fontWeight={400} noOfLines={1}>
                {request.submittedAt
                  ? `Enviada ${timeAgo(request.submittedAt)}${
                      request.submittedByName && request.submittedById !== request.createdById ? ` por ${request.submittedByName}` : ""
                    }`
                  : "Aún no enviada"}
              </Text>
            </SummaryItem>
            <SummaryItem label="Tickets">
              {request.tickets.length ? (
                <Wrap spacing={1}>
                  {request.tickets.map((t) => (
                    <Badge key={t} variant="outline" colorScheme="gray">
                      {t}
                    </Badge>
                  ))}
                </Wrap>
              ) : (
                <Text color="text.muted" fontWeight={400}>
                  Ninguno
                </Text>
              )}
            </SummaryItem>
          </Grid>
        </CardBody>
      </Card>

      <Tabs variant="line" isLazy>
        <TabList>
          <Tab fontWeight={600}>Clientes ({request.targetsTotal})</Tab>
          <Tab fontWeight={600}>
            Paquete ({artifacts.length}
            {newArtifacts > 0 && `, ${newArtifacts} ${newArtifacts === 1 ? "nuevo" : "nuevos"}`})
          </Tab>
          <Tab fontWeight={600}>Detalles</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <Card>
              <Flex p={4} gap={3} justify="space-between" wrap="wrap" align="center">
                <ButtonGroup size="sm" isAttached variant="outline">
                  {TARGET_FILTERS.map((f) => (
                    <Button
                      key={f.key}
                      variant={filter === f.key ? "solid" : "outline"}
                      colorScheme={filter === f.key ? "brand" : "gray"}
                      onClick={() => setFilter(f.key)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </ButtonGroup>
                {canOperate && selected.length > 0 && (
                  <HStack>
                    <Text fontSize="sm" color="text.muted">
                      {selected.length} elegidos
                    </Text>
                    {bulkOptions.map((s) => (
                      <Button key={s} size="sm" leftIcon={ACTION_ICONS[s]} onClick={() => bulkChange(s)} isLoading={bulkRunning}>
                        {targetActionLabel(selectedTargets.find((t) => t.nextStatuses.includes(s))?.status ?? "Pending", s)}
                      </Button>
                    ))}
                  </HStack>
                )}
              </Flex>

              {request.targets.length === 0 ? (
                <EmptyBlock
                  title="Esta solicitud aún no tiene clientes"
                  description="Elige a qué clientes se enviará el paquete."
                  actionLabel={isDraft && canDeploy && request.packageId ? "Agregar clientes" : undefined}
                  onAction={openAddClients}
                />
              ) : (
                <Box overflowX="auto">
                  <Table>
                    <Thead>
                      <Tr>
                        {canOperate && !isDraft && (
                          <Th w="40px">
                            <Checkbox
                              aria-label="Elegir todos"
                              isChecked={visibleTargets.length > 0 && visibleTargets.every((t) => selected.includes(t.id))}
                              onChange={(e) => setSelected(e.target.checked ? visibleTargets.map((t) => t.id) : [])}
                            />
                          </Th>
                        )}
                        <Th w="32px" />
                        <Th>Cliente</Th>
                        <Th>Estado</Th>
                        <Th display={{ base: "none", md: "table-cell" }}>Intentos</Th>
                        <Th display={{ base: "none", md: "table-cell" }}>Último cambio</Th>
                        <Th textAlign="right">Acciones</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {visibleTargets.map((t) => {
                        const isOpen = expanded.has(t.id);
                        const primary = t.nextStatuses.filter((s) => isPrimaryTargetAction(t.status, s));
                        const secondary = t.nextStatuses.filter((s) => !isPrimaryTargetAction(t.status, s));
                        const colSpan = canOperate && !isDraft ? 7 : 6;
                        return (
                          <Fragment key={t.id}>
                            <Tr _hover={{ bg: "bg.hover" }}>
                              {canOperate && !isDraft && (
                                <Td>
                                  <Checkbox
                                    aria-label={`Elegir ${t.clientName}`}
                                    isChecked={selected.includes(t.id)}
                                    onChange={() =>
                                      setSelected((prev) => (prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]))
                                    }
                                  />
                                </Td>
                              )}
                              <Td>
                                <IconButton
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="gray"
                                  aria-label={isOpen ? "Ocultar detalle" : "Ver detalle"}
                                  icon={isOpen ? <FiChevronDown /> : <FiChevronRight />}
                                  onClick={() =>
                                    setExpanded((prev) => {
                                      const next = new Set(prev);
                                      next.has(t.id) ? next.delete(t.id) : next.add(t.id);
                                      return next;
                                    })
                                  }
                                />
                              </Td>
                              <Td maxW="320px">
                                <Text fontWeight={600} noOfLines={1}>
                                  {t.clientName}
                                </Text>
                                <Text fontSize="xs" color="text.muted">
                                  <Mono>{t.clientCode}</Mono> · <Mono>{t.environmentCode}</Mono>
                                </Text>
                                {t.errorComment && t.status === "Failed" && (
                                  <Text fontSize="xs" color="red.500" noOfLines={1} title={t.errorComment}>
                                    {t.errorComment}
                                  </Text>
                                )}
                              </Td>
                              <Td>
                                <TargetStatusBadge status={t.status} />
                              </Td>
                              <Td display={{ base: "none", md: "table-cell" }} className="tabular">
                                {t.attempts}
                              </Td>
                              <Td display={{ base: "none", md: "table-cell" }}>
                                <Text fontSize="sm">{timeAgo(t.finishedAt ?? t.startedAt ?? request.submittedAt)}</Text>
                              </Td>
                              <Td textAlign="right">
                                <HStack justify="flex-end" spacing={1}>
                                  {isDraft && canDeploy && (
                                    <Tooltip label="Quitar de la solicitud">
                                      <IconButton
                                        size="sm"
                                        variant="ghost"
                                        colorScheme="red"
                                        aria-label="Quitar cliente"
                                        icon={<FiTrash2 />}
                                        onClick={() => run(() => removeTarget(id, t.id), `${t.clientName} quitado`)}
                                      />
                                    </Tooltip>
                                  )}
                                  {canOperate &&
                                    primary.map((s) => (
                                      <Button
                                        key={s}
                                        size="sm"
                                        variant={s === "Applied" ? "solid" : "outline"}
                                        colorScheme={s === "Failed" ? "red" : s === "Applied" ? "green" : "gray"}
                                        leftIcon={ACTION_ICONS[s]}
                                        onClick={() => setAction({ target: t, toStatus: s })}
                                        data-guia="detalle.cliente.resultado"
                                      >
                                        {targetButtonLabel(t.status, s)}
                                      </Button>
                                    ))}
                                  {canOperate && secondary.length > 0 && (
                                    <Menu placement="bottom-end">
                                      <MenuButton as={IconButton} size="sm" variant="ghost" colorScheme="gray" icon={<FiMoreHorizontal />} aria-label="Más acciones" />
                                      <MenuList>
                                        {secondary.map((s) => (
                                          <MenuItem key={s} onClick={() => setAction({ target: t, toStatus: s })} color={s === "RolledBack" ? "red.500" : undefined}>
                                            {targetActionLabel(t.status, s)}
                                          </MenuItem>
                                        ))}
                                      </MenuList>
                                    </Menu>
                                  )}
                                </HStack>
                              </Td>
                            </Tr>
                            <Tr>
                              <Td colSpan={colSpan} p={0} borderBottomWidth={isOpen ? "1px" : 0}>
                                <Collapse in={isOpen} animateOpacity>
                                  <TargetDetails target={t} artifacts={artifacts} />
                                </Collapse>
                              </Td>
                            </Tr>
                          </Fragment>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </Card>
          </TabPanel>

          <TabPanel px={0}>
            <Card>
              {artifacts.length === 0 ? (
                <EmptyBlock title="La solicitud no tiene paquete asociado" />
              ) : (
                <Box overflowX="auto">
                  {artifacts.length > ARTIFACT_PAGE && (
                    <Flex p={4} gap={3} align="center" wrap="wrap">
                      <Input
                        id="package-artifact-search"
                        size="sm"
                        maxW="300px"
                        placeholder="Buscar artefacto o ruta"
                        value={artifactSearch}
                        onChange={(e) => {
                          setArtifactSearch(e.target.value);
                          setArtifactLimit(ARTIFACT_PAGE);
                        }}
                      />
                      <Text fontSize="sm" color="text.muted">
                        {filteredArtifacts.length} de {artifacts.length}
                      </Text>
                    </Flex>
                  )}
                  <Table>
                    <Thead>
                      <Tr>
                        <Th w="48px">Orden</Th>
                        <Th>Artefacto</Th>
                        <Th>Tipo</Th>
                        <Th>Cambio</Th>
                        <Th display={{ base: "none", lg: "table-cell" }}>Ruta</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredArtifacts.slice(0, artifactLimit).map((a) => (
                        <Tr key={a.id} bg={a.isNew ? "green.50" : undefined} _dark={a.isNew ? { bg: "rgba(72,187,120,0.08)" } : undefined}>
                          <Td className="tabular">{a.executionOrder}</Td>
                          <Td>
                            <Mono fontWeight={600}>{a.code}</Mono>
                            {a.notes && (
                              <Text fontSize="xs" color="text.muted">
                                {a.notes}
                              </Text>
                            )}
                          </Td>
                          <Td>
                            <ArtifactTypeLabel type={a.type} />
                          </Td>
                          <Td>
                            <HStack spacing={1}>
                              <ChangeTypeBadge changeType={a.changeType} />
                              {a.ownerClientId && <CustomBadge clientName={a.ownerClientName} />}
                            </HStack>
                          </Td>
                          <Td display={{ base: "none", lg: "table-cell" }}>
                            <Mono fontSize="xs" color="text.muted">
                              {a.path ?? "—"}
                            </Mono>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {filteredArtifacts.length > artifactLimit && (
                    <Box textAlign="center" py={3}>
                      <Button size="sm" variant="ghost" onClick={() => setArtifactLimit((n) => n + ARTIFACT_PAGE * 4)}>
                        Mostrar más ({filteredArtifacts.length - artifactLimit} restantes)
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </Card>
          </TabPanel>

          <TabPanel px={0}>
            <Card>
              <CardBody>
                <Grid templateColumns={{ base: "1fr", md: "repeat(3, minmax(0,1fr))" }} gap={6}>
                  <SummaryItem label="Comentario">
                    <Text fontWeight={400}>{request.comment || "—"}</Text>
                  </SummaryItem>
                  <SummaryItem label="Creada">{dateWithPerson(request.createdAt, request.createdByName)}</SummaryItem>
                  <SummaryItem label="Enviada">{dateWithPerson(request.submittedAt, request.submittedByName)}</SummaryItem>
                  <SummaryItem label="Aprobada">{dateWithPerson(request.approvedAt, request.approvedByName)}</SummaryItem>
                  <SummaryItem label="Terminada">{formatDateTime(request.completedAt)}</SummaryItem>
                  <SummaryItem label="Cancelada">
                    {request.cancelledAt ? `${formatDateTime(request.cancelledAt)}${request.cancellationReason ? ` · ${request.cancellationReason}` : ""}` : "—"}
                  </SummaryItem>
                </Grid>
                {request.package && (
                  <>
                    <Heading size="xs" mt={8} mb={3} color="text.muted">
                      Origen del paquete
                    </Heading>
                    <Grid templateColumns={{ base: "1fr", md: "repeat(3, minmax(0,1fr))" }} gap={6}>
                      <SummaryItem label="Rama">{request.package.branch ?? "—"}</SummaryItem>
                      <SummaryItem label="Commit">
                        <Mono>{request.package.commitId?.slice(0, 10) ?? "—"}</Mono>
                      </SummaryItem>
                      <SummaryItem label="Autor">{request.package.commitAuthor ?? "—"}</SummaryItem>
                    </Grid>
                  </>
                )}
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <ReportResultModal
        isOpen={!!action}
        onClose={() => setAction(null)}
        target={action?.target}
        toStatus={action?.toStatus}
        artifacts={artifacts}
        onSubmit={reportStatus}
      />

      <ConfirmDialog
        isOpen={submitDialog.isOpen}
        onClose={submitDialog.onClose}
        colorScheme="brand"
        title={`Enviar ${request.displayNumber}`}
        body={`Se enviará a ${request.targetsTotal} ${request.targetsTotal === 1 ? "cliente" : "clientes"} y el paquete ya no se podrá modificar.`}
        confirmLabel="Enviar solicitud"
        onConfirm={() => run(() => submitDeploymentRequest(id), "Solicitud enviada")}
      />

      <ConfirmDialog
        isOpen={cancelDialog.isOpen}
        onClose={cancelDialog.onClose}
        title={isDraft ? "Descartar borrador" : `Cancelar ${request.displayNumber}`}
        body={
          isDraft
            ? "El borrador se marcará como cancelado."
            : "Se cancelan los clientes que aún no se desplegaron. Los que ya se aplicaron conservan su resultado."
        }
        confirmLabel={isDraft ? "Descartar" : "Cancelar solicitud"}
        withReason
        reasonLabel="Motivo (opcional)"
        onConfirm={(reason) =>
          run(() => cancelDeploymentRequest(id, reason), isDraft ? "Borrador descartado" : "Solicitud cancelada").then(
            (ok) => ok && isDraft && navigate("/deployments?view=draft")
          )
        }
      />

      <Modal isOpen={addClients.isOpen} onClose={addClients.onClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Agregar clientes</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <InstallationPicker
              installations={installations}
              selected={toAdd}
              onChange={setToAdd}
              excludeIds={request.targets.map((t) => t.installationId)}
            />
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" colorScheme="gray" onClick={addClients.onClose}>
              Volver
            </Button>
            <Button
              isDisabled={toAdd.length === 0}
              onClick={async () => {
                const ok = await run(() => addTargets(id, toAdd), `${toAdd.length} clientes agregados`);
                if (ok) addClients.onClose();
              }}
            >
              Agregar {toAdd.length > 0 ? toAdd.length : ""}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default function DeploymentRequestDetail() {
  return (
    <Layout>
      <DetailInner />
    </Layout>
  );
}
