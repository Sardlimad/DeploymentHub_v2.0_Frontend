import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Grid,
  GridItem,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { FiAlertTriangle, FiArrowRight, FiClock, FiPlus, FiRefreshCw, FiSend } from "react-icons/fi";
import Layout from "../components/Layout";
import PageHeader from "../components/common/PageHeader";
import StatCard from "../components/common/StatCard";
import Mono from "../components/common/Mono";
import TargetProgress from "../components/common/TargetProgress";
import { CustomBadge, RequestStatusBadge } from "../components/common/StatusBadge";
import { EmptyBlock, ErrorBlock, LoadingRows } from "../components/common/DataState";
import { AuthContext } from "../context/AuthContext";
import { RealtimeContext } from "../context/RealtimeContext";
import { searchDeploymentRequests } from "../services/deploymentRequests";
import { getInstallations } from "../services/installations";
import { apiErrorMessage } from "../services/api";
import { RealtimeEvents } from "../services/deploymentsRealtime";
import { useDeploymentsRealtime } from "../hooks/useDeploymentsRealtime";
import { IN_FLIGHT_STATUSES } from "../helpers/deploymentStatus";
import { describeEvent } from "../helpers/realtimeText";
import { timeAgo } from "../helpers/format";

const cardAppear = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const REFRESH_EVENTS = new Set([
  RealtimeEvents.DEPLOYMENT_SUBMITTED,
  RealtimeEvents.DEPLOYMENT_STATUS_CHANGED,
  RealtimeEvents.TARGET_STATUS_CHANGED,
  RealtimeEvents.INSTALLATION_UPDATED,
]);

function RequestRow({ request, highlight, onOpen }) {
  return (
    <Box
      as="button"
      onClick={onOpen}
      textAlign="left"
      w="full"
      p={4}
      rounded="md"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="bg.surface"
      _hover={{ borderColor: "brand.300", bg: "bg.hover" }}
      _focusVisible={{ outline: "2px solid", outlineColor: "brand.400" }}
      animation={highlight ? `${cardAppear} 320ms ease both` : undefined}
    >
      <Grid templateColumns={{ base: "1fr", md: "minmax(0,1fr) 200px auto" }} gap={4} alignItems="center">
        <Box minW={0}>
          <HStack spacing={2} mb={1}>
            <Mono fontWeight={700} color="accent.fg">
              {request.displayNumber}
            </Mono>
            <Text fontSize="sm" color="text.muted" noOfLines={1}>
              · {request.productName ?? "Sin producto"}
            </Text>
            {request.isCustom && <CustomBadge clientName={request.customClientName} />}
          </HStack>
          <Text fontWeight={600} noOfLines={1}>
            {request.packageDescription || request.comment || "Sin descripción"}
          </Text>
          <Text fontSize="xs" color="text.muted" mt={0.5}>
            Enviada {timeAgo(request.submittedAt)}
          </Text>
        </Box>
        <TargetProgress
          applied={request.targetsApplied}
          failed={request.targetsFailed}
          pending={request.targetsPending}
          total={request.targetsTotal}
        />
        <RequestStatusBadge status={request.status} />
      </Grid>
    </Box>
  );
}

function DashboardInner() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, hasRole } = useContext(AuthContext);
  const { events } = useContext(RealtimeContext);
  const [requests, setRequests] = useState([]);
  const [drafts, setDrafts] = useState(0);
  const [outdated, setOutdated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentIds, setRecentIds] = useState(new Set());
  const seenIdsRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [inFlight, draftPage, outdatedList] = await Promise.all([
        searchDeploymentRequests({ statuses: IN_FLIGHT_STATUSES, pageSize: 50 }),
        searchDeploymentRequests({ statuses: ["Draft"], pageSize: 1 }),
        getInstallations({ onlyOutdated: true }),
      ]);

      const ids = new Set(inFlight.items.map((r) => r.id));
      if (seenIdsRef.current) {
        const fresh = [...ids].filter((id) => !seenIdsRef.current.has(id));
        if (fresh.length) {
          setRecentIds(new Set(fresh));
          setTimeout(() => setRecentIds(new Set()), 1200);
        }
      }
      seenIdsRef.current = ids;

      setRequests(inFlight.items);
      setDrafts(draftPage.totalCount);
      setOutdated(outdatedList);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Revisa que la API esté disponible."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => clearTimeout(refreshTimerRef.current);
  }, [load]);

  useDeploymentsRealtime((event) => {
    if (event.type === RealtimeEvents.TARGET_STATUS_CHANGED && event.payload?.target?.status === "Failed") {
      toast({
        title: `${event.payload.displayNumber}: falló en ${event.payload.target.clientName}`,
        description: event.payload.target.errorComment,
        status: "error",
        duration: 8000,
      });
    }
    if (REFRESH_EVENTS.has(event.type)) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(load, 300);
    }
  });

  const pending = requests.filter((r) => r.status === "Pending" || r.status === "Approved").length;
  const inProgress = requests.filter((r) => r.status === "InProgress").length;
  const withFailures = requests.filter((r) => r.targetsFailed > 0).length;
  const canCreate = hasRole("DEVELOPER");
  const canOperate = hasRole("INFRA");

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.name?.split(" ")[0] ?? ""}`}
        description={
          canOperate
            ? "Estas son las actualizaciones que esperan aplicarse en los clientes."
            : "Así van los despliegues en este momento."
        }
        actions={
          <>
            <Button variant="ghost" colorScheme="gray" leftIcon={<FiRefreshCw />} onClick={load}>
              Actualizar
            </Button>
            {canCreate && (
              <Button leftIcon={<FiPlus />} onClick={() => navigate("/deployments/new")}>
                Nueva solicitud
              </Button>
            )}
          </>
        }
      />

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4} mb={6}>
        <StatCard
          label="Por aplicar"
          value={pending}
          hint="Enviadas, ningún cliente empezó"
          icon={<FiClock />}
          tone="brand"
          onClick={() => navigate("/deployments?view=active")}
        />
        <StatCard
          label="En curso"
          value={inProgress}
          hint="Con clientes ya aplicados o en proceso"
          icon={<FiSend />}
          tone="brand"
          onClick={() => navigate("/deployments?view=active")}
        />
        <StatCard
          label="Con clientes fallidos"
          value={withFailures}
          hint="Requieren reintento o revisión"
          icon={<FiAlertTriangle />}
          tone="danger"
          onClick={() => navigate("/deployments?view=active")}
        />
        <StatCard
          label="Clientes desactualizados"
          value={outdated.length}
          hint="Tienen una versión anterior a la vigente"
          icon={<FiAlertTriangle />}
          tone="warning"
          onClick={() => navigate("/clients-status?outdated=1")}
        />
      </SimpleGrid>

      <Grid templateColumns={{ base: "1fr", xl: "minmax(0,2fr) minmax(0,1fr)" }} gap={6}>
        <GridItem minW={0}>
          <Card>
            <CardHeader pb={2}>
              <HStack justify="space-between">
                <Heading size="sm">Solicitudes en curso</Heading>
                <Button size="sm" variant="link" rightIcon={<FiArrowRight />} onClick={() => navigate("/deployments")}>
                  Ver todas
                </Button>
              </HStack>
            </CardHeader>
            <CardBody pt={2}>
              {loading ? (
                <LoadingRows rows={4} height="76px" />
              ) : error ? (
                <ErrorBlock message={error} onRetry={load} />
              ) : requests.length === 0 ? (
                <EmptyBlock
                  title="No hay solicitudes en curso"
                  description={
                    drafts > 0
                      ? `Tienes ${drafts} ${drafts === 1 ? "borrador" : "borradores"} sin enviar.`
                      : "Cuando se envíe una solicitud aparecerá aquí al instante."
                  }
                  actionLabel={drafts > 0 ? "Ver borradores" : canCreate ? "Crear solicitud" : undefined}
                  onAction={() => navigate(drafts > 0 ? "/deployments?view=draft" : "/deployments/new")}
                />
              ) : (
                <Stack spacing={2}>
                  {requests.map((r) => (
                    <RequestRow
                      key={r.id}
                      request={r}
                      highlight={recentIds.has(r.id)}
                      onOpen={() => navigate(`/deployments/${r.id}`)}
                    />
                  ))}
                </Stack>
              )}
            </CardBody>
          </Card>
        </GridItem>

        <GridItem minW={0}>
          <Stack spacing={6}>
            <Card>
              <CardHeader pb={2}>
                <HStack justify="space-between">
                  <Heading size="sm">Clientes desactualizados</Heading>
                  <Button size="sm" variant="link" rightIcon={<FiArrowRight />} onClick={() => navigate("/clients-status?outdated=1")}>
                    Ver estado
                  </Button>
                </HStack>
              </CardHeader>
              <CardBody pt={2}>
                {outdated.length === 0 ? (
                  <Text fontSize="sm" color="text.muted">
                    Todos los clientes tienen la última versión aplicada en su ambiente.
                  </Text>
                ) : (
                  <Stack spacing={3}>
                    {outdated.slice(0, 5).map((i) => (
                      <Box key={i.id}>
                        <HStack justify="space-between">
                          <Text fontWeight={600} fontSize="sm" noOfLines={1}>
                            {i.clientName}
                          </Text>
                          <Mono fontSize="xs" color="text.muted">
                            {i.environmentCode}
                          </Mono>
                        </HStack>
                        <Text fontSize="xs" color="text.muted" noOfLines={1}>
                          {i.productName} · {i.currentPackageDescription ? `tiene ${i.currentPackageDescription}` : "sin paquetes aplicados"}
                        </Text>
                      </Box>
                    ))}
                    {outdated.length > 5 && (
                      <Text fontSize="xs" color="text.muted">
                        y {outdated.length - 5} más
                      </Text>
                    )}
                  </Stack>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader pb={2}>
                <Heading size="sm">Actividad en vivo</Heading>
              </CardHeader>
              <CardBody pt={2}>
                {events.length === 0 ? (
                  <Text fontSize="sm" color="text.muted">
                    Aquí verás cada cambio en cuanto ocurra: envíos, clientes aplicados o fallidos.
                  </Text>
                ) : (
                  <Stack spacing={3}>
                    {events.slice(0, 8).map((event) => {
                      const line = describeEvent(event);
                      return (
                        <HStack
                          key={`${event.type}-${event.occurredAt}-${event.requestId ?? ""}`}
                          align="start"
                          spacing={3}
                          cursor={line.requestId ? "pointer" : "default"}
                          onClick={() => line.requestId && navigate(`/deployments/${line.requestId}`)}
                        >
                          <Box w="8px" h="8px" mt="6px" rounded="full" bg={`${line.tone}.400`} flexShrink={0} />
                          <Box minW={0}>
                            <Text fontSize="sm" noOfLines={2}>
                              {line.text}
                            </Text>
                            <Text fontSize="xs" color="text.muted">
                              {timeAgo(event.occurredAt)}
                            </Text>
                          </Box>
                        </HStack>
                      );
                    })}
                  </Stack>
                )}
              </CardBody>
            </Card>
          </Stack>
        </GridItem>
      </Grid>
    </>
  );
}

export default function Dashboard() {
  return (
    <Layout>
      <DashboardInner />
    </Layout>
  );
}
