import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Collapse,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  Radio,
  RadioGroup,
  SimpleGrid,
  Stack,
  Select,
  Step,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  Switch,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Textarea,
  useToast,
  Wrap,
} from "@chakra-ui/react";
import { FiArrowLeft, FiArrowRight, FiSave, FiSend } from "react-icons/fi";
import Layout from "../components/Layout";
import PageHeader from "../components/common/PageHeader";
import Mono from "../components/common/Mono";
import { ChangeTypeBadge, CustomBadge } from "../components/common/StatusBadge";
import { EmptyBlock, LoadingRows } from "../components/common/DataState";
import ArtifactEditor from "../components/packages/ArtifactEditor";
import InstallationPicker from "../components/deployments/InstallationPicker";
import { AuthContext } from "../context/AuthContext";
import { listProductArtifacts, listProducts } from "../services/catalog";
import { createPackage, getPackages } from "../services/packages";
import { getInstallations } from "../services/installations";
import { addTargets, createDeploymentRequest, submitDeploymentRequest } from "../services/deploymentRequests";
import { apiErrorMessage } from "../services/api";
import { toPackageArtifacts } from "../helpers/packageArtifacts";
import { formatDate, pluralize } from "../helpers/format";
import { isValidUrl } from "../helpers/validations";
import { customClientNames, customConflicts, customEffectText, ownVersionsOverwritten } from "../helpers/customArtifacts";

const STEPS = [
  { title: "Producto", description: "Qué se actualiza" },
  { title: "Paquete", description: "Qué artefactos van" },
  { title: "Clientes", description: "A quién se envía" },
  { title: "Revisión", description: "Confirmar y enviar" },
];

function OptionCard({ selected, onClick, children }) {
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      textAlign="left"
      w="full"
      p={4}
      rounded="lg"
      borderWidth="2px"
      borderColor={selected ? "brand.500" : "border.subtle"}
      bg={selected ? "accent.subtle" : "bg.surface"}
      _hover={{ borderColor: selected ? "brand.500" : "brand.200" }}
      _focusVisible={{ outline: "2px solid", outlineColor: "brand.400", outlineOffset: "2px" }}
      transition="border-color 0.15s ease"
    >
      {children}
    </Box>
  );
}

function WizardInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { hasRole } = useContext(AuthContext);
  const preset = location.state ?? {};

  const [step, setStep] = useState(preset.productId ? (preset.packageId ? 2 : 1) : 0);
  const [products, setProducts] = useState(null);
  const [productId, setProductId] = useState(preset.productId ?? "");
  const [packageMode, setPackageMode] = useState(preset.packageId ? "existing" : "new");
  const [packages, setPackages] = useState([]);
  const [packageId, setPackageId] = useState(preset.packageId ?? "");
  const [newPackage, setNewPackage] = useState({ description: "", packageUrl: "", branch: "", commitId: "", customClientId: "" });
  const [showSource, setShowSource] = useState(false);
  const [artifacts, setArtifacts] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [selectedInstallations, setSelectedInstallations] = useState(preset.installationIds ?? []);
  const [comment, setComment] = useState("");
  const [tickets, setTickets] = useState([]);
  const [ticketInput, setTicketInput] = useState("");
  const [saving, setSaving] = useState(null); // "draft" | "send"
  const [catalog, setCatalog] = useState([]); // versiones de artefactos del producto

  useEffect(() => {
    listProducts()
      .then((list) => setProducts(list.filter((p) => p.isActive)))
      .catch((err) => {
        setProducts([]);
        toast({ title: "No se pudieron cargar los productos", description: apiErrorMessage(err), status: "error" });
      });
  }, [toast]);

  // Al cambiar de producto se recargan sus paquetes y clientes, y se limpia lo elegido.
  useEffect(() => {
    if (!productId) return;
    getPackages(productId).then(setPackages).catch(() => setPackages([]));
    getInstallations({ productId }).then(setInstallations).catch(() => setInstallations([]));
    listProductArtifacts(productId).then(setCatalog).catch(() => setCatalog([]));
  }, [productId]);

  const chooseProduct = (id) => {
    if (id !== productId) {
      setPackageId("");
      setArtifacts([]);
      setSelectedInstallations([]);
    }
    setProductId(id);
  };

  const product = products?.find((p) => p.id === productId);
  const existingPackage = packages.find((p) => p.id === packageId);
  // Actualización personalizada: el paquete (nuevo o existente) va a un solo cliente.
  const customClientId = (packageMode === "new" ? newPackage.customClientId : existingPackage?.customClientId) || "";
  const productClients = [...new Map(installations.map((i) => [i.clientId, i.clientName])).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const customClientName = productClients.find((c) => c.id === customClientId)?.name ?? existingPackage?.customClientName;
  const pickableInstallations = customClientId ? installations.filter((i) => i.clientId === customClientId) : installations;
  const chosenInstallations = pickableInstallations.filter((i) => selectedInstallations.includes(i.id));
  // El cliente del paquete pudo cambiar después de agregar artefactos: se vuelve a avisar en la revisión.
  const reviewConflicts = packageMode === "new" ? customConflicts(artifacts, newPackage.customClientId || "") : [];
  // Paquete general: los clientes con versión propia de alguno de sus artefactos la verían reemplazada.
  const overwritten = useMemo(() => {
    if (customClientId) return {};
    const items = packageMode === "new" ? artifacts : existingPackage?.artifacts ?? [];
    return ownVersionsOverwritten(items, catalog);
  }, [customClientId, packageMode, artifacts, existingPackage, catalog]);
  const overwriteWarnings = Object.fromEntries(
    Object.entries(overwritten).map(([clientId, codes]) => [
      clientId,
      `Tiene versión propia de ${codes.slice(0, 3).join(", ")}${codes.length > 3 ? ` y ${codes.length - 3} más` : ""}: este paquete general la reemplazaría.`,
    ])
  );
  const overwrittenChosen = [...new Set(chosenInstallations.filter((i) => overwritten[i.clientId]).map((i) => i.clientName))];
  const packageArtifactCount = packageMode === "new" ? artifacts.length : existingPackage?.artifacts.length ?? 0;
  const packageNewCount = packageMode === "new" ? artifacts.filter((a) => a.isNew).length : existingPackage?.newArtifactsCount ?? 0;

  // Qué falta para avanzar en cada paso (null = puede avanzar).
  const blocker = useMemo(() => {
    if (step === 0 && !productId) return "Elige el producto que se va a actualizar.";
    if (step === 1) {
      if (packageMode === "existing" && !packageId) return "Elige un paquete.";
      if (packageMode === "new" && !newPackage.description.trim()) return "Describe el paquete (ej: «Anulación de facturas en Cajas»).";
      if (packageMode === "new" && newPackage.packageUrl && !isValidUrl(newPackage.packageUrl)) return "El enlace del paquete no es una URL válida.";
      if (packageMode === "new" && artifacts.length === 0) return "Agrega al menos un artefacto.";
    }
    if (step === 1 && packageMode === "new" && newPackage.customClientId === null) return "Elige el cliente de la actualización personalizada.";
    if (step === 2 && chosenInstallations.length === 0) return "Elige al menos un cliente.";
    return null;
  }, [step, productId, packageMode, packageId, newPackage, artifacts, chosenInstallations]);

  const addTicket = () => {
    const values = ticketInput
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (values.length) setTickets((prev) => [...new Set([...prev, ...values])]);
    setTicketInput("");
  };

  const save = async (send) => {
    setSaving(send ? "send" : "draft");
    let requestId = null;
    try {
      let finalPackageId = packageId;
      if (packageMode === "new") {
        const created = await createPackage({
          productId,
          description: newPackage.description.trim(),
          packageUrl: newPackage.packageUrl || null,
          customClientId: newPackage.customClientId || null,
          branch: newPackage.branch.trim() || null,
          commitId: newPackage.commitId.trim() || null,
          artifacts: toPackageArtifacts(artifacts),
        });
        finalPackageId = created.id;
      }

      const request = await createDeploymentRequest({
        packageId: finalPackageId,
        comment: comment.trim() || null,
        tickets,
      });
      requestId = request.id;
      await addTargets(requestId, chosenInstallations.map((i) => i.id));
      if (send) await submitDeploymentRequest(requestId);

      toast({
        title: send ? `${request.displayNumber} enviada` : `${request.displayNumber} guardada como borrador`,
        description: send ? `${selectedInstallations.length} clientes quedaron pendientes de aplicar.` : undefined,
        status: "success",
      });
      navigate(`/deployments/${requestId}`);
    } catch (err) {
      toast({
        title: "No se pudo completar",
        description: requestId
          ? `${apiErrorMessage(err)} La solicitud quedó como borrador; puedes terminarla desde su detalle.`
          : apiErrorMessage(err),
        status: "error",
        duration: 8000,
      });
      if (requestId) navigate(`/deployments/${requestId}`);
    } finally {
      setSaving(null);
    }
  };

  if (!hasRole("DEVELOPER")) {
    return (
      <EmptyBlock
        title="Tu rol no permite crear solicitudes"
        description="Las solicitudes las crean los desarrolladores o un administrador."
        actionLabel="Volver al panel"
        onAction={() => navigate("/dashboard")}
      />
    );
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Solicitudes", to: "/deployments" }, { label: "Nueva solicitud" }]}
        title="Nueva solicitud"
        description="Arma el paquete, elige los clientes y envíalo. Puedes guardarlo como borrador en el último paso."
      />

      <Card mb={6}>
        <CardBody>
          <Stepper index={step} size="sm" colorScheme="brand">
            {STEPS.map((s, i) => (
              <Step key={s.title} onClick={() => i < step && setStep(i)} style={{ cursor: i < step ? "pointer" : "default" }}>
                <StepIndicator>
                  <StepStatus complete={<StepIcon />} incomplete={<StepNumber />} active={<StepNumber />} />
                </StepIndicator>
                <Box flexShrink="0" display={{ base: i === step ? "block" : "none", md: "block" }}>
                  <StepTitle>{s.title}</StepTitle>
                  <Text fontSize="xs" color="text.muted">
                    {s.description}
                  </Text>
                </Box>
                <StepSeparator />
              </Step>
            ))}
          </Stepper>
        </CardBody>
      </Card>

      <Card>
        <CardBody p={{ base: 4, md: 6 }}>
          {step === 0 &&
            (products === null ? (
              <LoadingRows rows={3} height="80px" />
            ) : products.length === 0 ? (
              <EmptyBlock
                title="No hay productos activos"
                description="Registra un producto en Catálogo › Productos para poder desplegarlo."
                actionLabel={hasRole() ? "Ir a productos" : undefined}
                onAction={() => navigate("/catalogs/products")}
              />
            ) : (
              <Stack spacing={4}>
                <Heading size="sm">¿Qué producto se actualiza?</Heading>
                <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={3}>
                  {products.map((p) => (
                    <OptionCard key={p.id} selected={p.id === productId} onClick={() => chooseProduct(p.id)}>
                      <HStack justify="space-between">
                        <Text fontWeight={700}>{p.name}</Text>
                        <Mono fontSize="xs" color="text.muted">
                          {p.code}
                        </Mono>
                      </HStack>
                      <Wrap mt={2} spacing={1}>
                        {p.productEnvironments.length === 0 ? (
                          <Text fontSize="xs" color="text.muted">
                            Sin ambientes configurados
                          </Text>
                        ) : (
                          p.productEnvironments.map((pe) => (
                            <Badge key={pe.id} variant="outline" colorScheme="gray">
                              {pe.environmentCode}
                            </Badge>
                          ))
                        )}
                      </Wrap>
                    </OptionCard>
                  ))}
                </SimpleGrid>
              </Stack>
            ))}

          {step === 1 && (
            <Stack spacing={5}>
              <Heading size="sm">¿Qué se envía a {product?.name}?</Heading>
              <RadioGroup value={packageMode} onChange={setPackageMode}>
                <HStack spacing={6}>
                  <Radio value="new">Armar un paquete nuevo</Radio>
                  <Radio value="existing" isDisabled={packages.length === 0}>
                    Usar un paquete existente {packages.length === 0 && "(no hay)"}
                  </Radio>
                </HStack>
              </RadioGroup>

              {packageMode === "existing" ? (
                <Stack spacing={2}>
                  {packages.map((p) => (
                    <OptionCard key={p.id} selected={p.id === packageId} onClick={() => setPackageId(p.id)}>
                      <Flex justify="space-between" gap={3} wrap="wrap">
                        <Box minW={0}>
                          <Text fontWeight={700}>{p.description}</Text>
                          <Text fontSize="sm" color="text.muted">
                            {p.artifacts.length} artefactos
                            {p.newArtifactsCount > 0 && ` · ${p.newArtifactsCount} nuevos`} · creado {formatDate(p.createdAt)}
                            {p.branch && ` · rama ${p.branch}`}
                          </Text>
                        </Box>
                        <HStack alignSelf="start">
                          {p.isCustom && <CustomBadge clientName={p.customClientName} />}
                          {p.isLocked && (
                            <Badge colorScheme="gray" variant="subtle">
                              Ya enviado antes
                            </Badge>
                          )}
                        </HStack>
                      </Flex>
                    </OptionCard>
                  ))}
                </Stack>
              ) : (
                <Stack spacing={5}>
                  <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={4}>
                    <FormControl isRequired>
                      <FormLabel>Descripción del paquete</FormLabel>
                      <Input
                        id="package-description"
                        placeholder="Anulación de facturas en Cajas"
                        value={newPackage.description}
                        onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                        maxLength={500}
                      />
                    </FormControl>
                    <FormControl isInvalid={!!newPackage.packageUrl && !isValidUrl(newPackage.packageUrl)}>
                      <FormLabel>Enlace del paquete en OneDrive</FormLabel>
                      <Input
                        id="package-url"
                        type="url"
                        placeholder="https://…sharepoint.com/…"
                        value={newPackage.packageUrl}
                        onChange={(e) => setNewPackage({ ...newPackage, packageUrl: e.target.value.trim() })}
                        maxLength={1000}
                      />
                      <FormHelperText>Infraestructura lo verá en la solicitud para descargar el comprimido.</FormHelperText>
                    </FormControl>
                  </Grid>
                  <Box borderWidth="1px" borderColor={newPackage.customClientId !== "" ? "purple.300" : "border.subtle"} rounded="md" p={4}>
                    <FormControl display="flex" alignItems="center">
                      <Switch
                        id="package-custom"
                        colorScheme="purple"
                        isChecked={newPackage.customClientId !== ""}
                        onChange={(e) => setNewPackage({ ...newPackage, customClientId: e.target.checked ? null : "" })}
                      />
                      <FormLabel htmlFor="package-custom" mb={0} ml={3} fontWeight={700}>
                        Actualización personalizada
                      </FormLabel>
                    </FormControl>
                    <Text fontSize="sm" color="text.muted" mt={1} ml={12}>
                      Para un solo cliente (reportes propios, correcciones de su estructura o incidentes). No cambia su versión vigente ni hace que
                      otros clientes aparezcan desactualizados.
                    </Text>
                    {newPackage.customClientId !== "" && (
                      <FormControl isRequired mt={3} ml={12} maxW="360px">
                        <FormLabel fontSize="sm">Cliente</FormLabel>
                        <Select
                          id="package-custom-client"
                          placeholder="Elige el cliente"
                          value={newPackage.customClientId ?? ""}
                          onChange={(e) => setNewPackage({ ...newPackage, customClientId: e.target.value || null })}
                        >
                          {productClients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                  <Box>
                    <Button size="sm" variant="link" onClick={() => setShowSource((v) => !v)}>
                      {showSource ? "Ocultar origen en el repositorio" : "Indicar rama y commit (opcional)"}
                    </Button>
                    <Collapse in={showSource} animateOpacity>
                      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3} mt={3}>
                        <FormControl>
                          <FormLabel fontSize="sm">Rama</FormLabel>
                          <Input id="package-branch" fontFamily="mono" placeholder="main" value={newPackage.branch} onChange={(e) => setNewPackage({ ...newPackage, branch: e.target.value })} />
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="sm">Commit</FormLabel>
                          <Input id="package-commit" fontFamily="mono" placeholder="4857c206" value={newPackage.commitId} onChange={(e) => setNewPackage({ ...newPackage, commitId: e.target.value })} />
                        </FormControl>
                      </Grid>
                    </Collapse>
                  </Box>
                  <ArtifactEditor
                    productId={productId}
                    items={artifacts}
                    onChange={setArtifacts}
                    packageClientId={newPackage.customClientId || ""}
                    packageClientName={newPackage.customClientId ? customClientName : null}
                  />
                </Stack>
              )}
            </Stack>
          )}

          {step === 2 && (
            <Stack spacing={4}>
              <Heading size="sm">¿A qué clientes se envía?</Heading>
              {customClientId && (
                <Alert status="info" rounded="md" fontSize="sm" colorScheme="purple">
                  <AlertIcon />
                  Actualización personalizada: solo se muestran los ambientes de {customClientName}.
                </Alert>
              )}
              <InstallationPicker
                installations={pickableInstallations}
                selected={selectedInstallations}
                onChange={setSelectedInstallations}
                warnings={overwriteWarnings}
              />
            </Stack>
          )}

          {step === 3 && (
            <Grid templateColumns={{ base: "1fr", lg: "minmax(0,3fr) minmax(0,2fr)" }} gap={8}>
              <Stack spacing={5}>
                <Box>
                  <Text fontSize="xs" color="text.muted" fontWeight={600}>
                    Producto
                  </Text>
                  <Text fontWeight={700}>{product?.name}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="text.muted" fontWeight={600}>
                    Paquete
                  </Text>
                  <Text fontWeight={700}>{packageMode === "new" ? newPackage.description : existingPackage?.description}</Text>
                  {(packageMode === "new" ? newPackage.packageUrl : existingPackage?.packageUrl) ? (
                    <Text fontSize="sm" color="accent.fg" noOfLines={1}>
                      {packageMode === "new" ? newPackage.packageUrl : existingPackage?.packageUrl}
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="orange.500">
                      Sin enlace al comprimido: infraestructura no sabrá de dónde descargarlo.
                    </Text>
                  )}
                  <Text fontSize="sm" color="text.muted">
                    {pluralize(packageArtifactCount, "artefacto")}
                    {packageNewCount > 0 && `, ${packageNewCount} ${packageNewCount === 1 ? "nuevo" : "nuevos"} en el catálogo`}
                  </Text>
                  <Stack spacing={1} mt={2}>
                    {(packageMode === "new"
                      ? artifacts.map((a) => ({ key: a.key, code: a.code, changeType: a.isNew ? "Added" : "Modified" }))
                      : existingPackage?.artifacts.map((a) => ({ key: a.id, code: a.code, changeType: a.changeType })) ?? []
                    ).map((a, i) => (
                      <HStack key={a.key} spacing={2}>
                        <Text fontSize="xs" color="text.muted" w="20px" className="tabular">
                          {i + 1}.
                        </Text>
                        <Mono fontSize="sm">{a.code}</Mono>
                        <ChangeTypeBadge changeType={a.changeType} />
                      </HStack>
                    ))}
                  </Stack>
                </Box>
                <Box>
                  <Text fontSize="xs" color="text.muted" fontWeight={600}>
                    Clientes ({chosenInstallations.length})
                  </Text>
                  <Wrap mt={1} spacing={1}>
                    {chosenInstallations.map((i) => (
                      <Tag key={i.id} size="sm" variant="subtle" colorScheme={i.isOutdated ? "orange" : "gray"}>
                        {i.clientName} · {i.environmentCode}
                      </Tag>
                    ))}
                  </Wrap>
                </Box>
              </Stack>

              <Stack spacing={4}>
                <FormControl>
                  <FormLabel>Comentario</FormLabel>
                  <Textarea id="request-comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Contexto para quien aplica la actualización" maxLength={1000} />
                </FormControl>
                <FormControl>
                  <FormLabel>Tickets</FormLabel>
                  <Input
                    id="request-tickets"
                    placeholder="CAJ-88 y Enter"
                    value={ticketInput}
                    onChange={(e) => setTicketInput(e.target.value)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), addTicket())}
                    onBlur={addTicket}
                  />
                  <FormHelperText>Separa varios con Enter o coma.</FormHelperText>
                  <Wrap mt={2} spacing={1}>
                    {tickets.map((t) => (
                      <Tag key={t} size="md" variant="subtle" colorScheme="brand">
                        <TagLabel>{t}</TagLabel>
                        <TagCloseButton onClick={() => setTickets(tickets.filter((x) => x !== t))} />
                      </Tag>
                    ))}
                  </Wrap>
                </FormControl>
                {reviewConflicts.length > 0 && (
                  <Alert status="warning" rounded="md" fontSize="sm">
                    <AlertIcon />
                    {reviewConflicts.length === 1
                      ? `${reviewConflicts[0].code} es personalizado de ${customClientNames(reviewConflicts[0])}.`
                      : `${reviewConflicts.length} artefactos son personalizados de otros clientes.`}{" "}
                    {customEffectText(customClientId ? customClientName : null)}
                  </Alert>
                )}
                {overwrittenChosen.length > 0 && (
                  <Alert status="warning" rounded="md" fontSize="sm">
                    <AlertIcon />
                    {overwrittenChosen.join(", ")} {overwrittenChosen.length === 1 ? "tiene" : "tienen"} versión propia de artefactos de este
                    paquete general: al aplicarlo recibirán la versión general.
                  </Alert>
                )}
                {customClientId && (
                  <Alert status="info" rounded="md" fontSize="sm" colorScheme="purple">
                    <AlertIcon />
                    Actualización personalizada para {customClientName}: no cambiará su versión vigente ni marcará desactualizados a otros
                    clientes.
                  </Alert>
                )}
                {packageNewCount > 0 && packageMode === "new" && (
                  <Alert status="success" rounded="md" fontSize="sm">
                    <AlertIcon />
                    {packageNewCount === 1 ? "1 artefacto nuevo se agregará" : `${packageNewCount} artefactos nuevos se agregarán`} al catálogo de {product?.name}.
                  </Alert>
                )}
              </Stack>
            </Grid>
          )}
        </CardBody>

        <Flex
          px={{ base: 4, md: 6 }}
          py={4}
          borderTopWidth="1px"
          borderColor="border.subtle"
          justify="space-between"
          align="center"
          gap={3}
          wrap="wrap"
        >
          <Button
            variant="ghost"
            colorScheme="gray"
            leftIcon={<FiArrowLeft />}
            onClick={() => (step === 0 ? navigate("/deployments") : setStep(step - 1))}
          >
            {step === 0 ? "Cancelar" : "Atrás"}
          </Button>
          <HStack spacing={3}>
            {blocker && (
              <Text fontSize="sm" color="text.muted" display={{ base: "none", md: "block" }}>
                {blocker}
              </Text>
            )}
            {step < STEPS.length - 1 ? (
              <Button rightIcon={<FiArrowRight />} onClick={() => setStep(step + 1)} isDisabled={!!blocker}>
                Siguiente
              </Button>
            ) : (
              <>
                <Button variant="outline" leftIcon={<FiSave />} onClick={() => save(false)} isLoading={saving === "draft"} isDisabled={!!saving}>
                  Guardar borrador
                </Button>
                <Button leftIcon={<FiSend />} onClick={() => save(true)} isLoading={saving === "send"} isDisabled={!!saving}>
                  Crear y enviar
                </Button>
              </>
            )}
          </HStack>
        </Flex>
      </Card>
    </>
  );
}

export default function CreateDeploymentRequest() {
  return (
    <Layout>
      <WizardInner />
    </Layout>
  );
}
