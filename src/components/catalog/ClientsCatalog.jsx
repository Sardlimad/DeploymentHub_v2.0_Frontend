import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Switch,
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
} from "@chakra-ui/react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import Mono from "../common/Mono";
import PageHeader from "../common/PageHeader";
import ConfirmDialog from "../common/ConfirmDialog";
import { EmptyBlock, ErrorBlock, LoadingRows } from "../common/DataState";
import { AuthContext } from "../../context/AuthContext";
import { createClient, deleteClient, listClients, listProducts, updateClient } from "../../services/catalog";
import { createInstallation, deleteInstallation, getInstallations, updateInstallation } from "../../services/installations";
import { apiErrorMessage } from "../../services/api";
import { formatDate } from "../../helpers/format";

function useRun() {
  const toast = useToast();
  return async (fn, success) => {
    try {
      await fn();
      if (success) toast({ title: success, status: "success" });
      return true;
    } catch (err) {
      toast({ title: "No se pudo completar", description: apiErrorMessage(err), status: "error", duration: 6000 });
      return false;
    }
  };
}

function InstallationsTab({ client, installations, products, isAdmin, onChanged }) {
  const run = useRun();
  const [productEnvironmentId, setProductEnvironmentId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const mine = installations.filter((i) => i.clientId === client.id);
  const used = new Set(mine.map((i) => i.productEnvironmentId));
  const options = products
    .filter((p) => p.isActive)
    .flatMap((p) => p.productEnvironments.filter((pe) => pe.isActive && !used.has(pe.id)).map((pe) => ({ id: pe.id, label: `${p.name} · ${pe.environmentCode}` })));

  return (
    <Stack spacing={4}>
      {mine.length === 0 ? (
        <Text fontSize="sm" color="text.muted">
          El cliente todavía no tiene productos. Asígnale uno para poder enviarle actualizaciones.
        </Text>
      ) : (
        <Stack spacing={2}>
          {mine.map((i) => (
            <Box key={i.id} borderWidth="1px" borderColor="border.subtle" rounded="md" px={3} py={2} opacity={i.isActive ? 1 : 0.6}>
              <HStack justify="space-between" align="start">
                <Box minW={0}>
                  <HStack>
                    <Text fontWeight={700}>{i.productName}</Text>
                    <Mono fontSize="sm">{i.environmentCode}</Mono>
                    {i.isOutdated && (
                      <Badge colorScheme="orange" variant="subtle">
                        Desactualizado
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="xs" color="text.muted">
                    Versión: {i.currentPackageDescription ?? "sin despliegues"}
                    {i.currentPackageAppliedAt && ` · ${formatDate(i.currentPackageAppliedAt)}`}
                  </Text>
                  {i.baseUrl && (
                    <Mono fontSize="xs" color="text.muted" noOfLines={1}>
                      {i.baseUrl}
                    </Mono>
                  )}
                </Box>
                {isAdmin && (
                  <HStack spacing={1}>
                    <Tooltip label={i.isActive ? "Desactivar (no aparecerá al crear solicitudes)" : "Activar"}>
                      <Box>
                        <Switch
                          size="sm"
                          aria-label="Activa"
                          isChecked={i.isActive}
                          onChange={(e) => run(() => updateInstallation(i.id, { baseUrl: i.baseUrl, isActive: e.target.checked })).then((ok) => ok && onChanged())}
                        />
                      </Box>
                    </Tooltip>
                    <Tooltip label="Quitar (solo si nunca se le desplegó)">
                      <IconButton
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        aria-label="Quitar producto"
                        icon={<FiTrash2 />}
                        onClick={() => run(() => deleteInstallation(i.id), "Producto quitado").then((ok) => ok && onChanged())}
                      />
                    </Tooltip>
                  </HStack>
                )}
              </HStack>
            </Box>
          ))}
        </Stack>
      )}

      {isAdmin && (
        <Box borderWidth="1px" borderStyle="dashed" borderColor="border.subtle" rounded="md" p={3}>
          <Text fontSize="sm" fontWeight={700} mb={2}>
            Asignar producto
          </Text>
          {options.length === 0 ? (
            <Text fontSize="sm" color="text.muted">
              No quedan productos con ambientes por asignar. Configura ambientes en Catálogo › Productos.
            </Text>
          ) : (
            <Flex gap={2} wrap="wrap">
              <Select id="inst-pe" size="sm" maxW="260px" placeholder="Producto y ambiente" value={productEnvironmentId} onChange={(e) => setProductEnvironmentId(e.target.value)}>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Input id="inst-url" size="sm" flex="1" minW="200px" fontFamily="mono" placeholder="URL del cliente (opcional)" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
              <Button
                size="sm"
                leftIcon={<FiPlus />}
                isDisabled={!productEnvironmentId}
                onClick={() =>
                  run(() => createInstallation({ clientId: client.id, productEnvironmentId, baseUrl }), "Producto asignado").then((ok) => {
                    if (ok) {
                      setProductEnvironmentId("");
                      setBaseUrl("");
                      onChanged();
                    }
                  })
                }
              >
                Asignar
              </Button>
            </Flex>
          )}
        </Box>
      )}
    </Stack>
  );
}

function ClientForm({ value, onChange, showActive }) {
  return (
    <Stack spacing={4}>
      <FormControl isRequired>
        <FormLabel>Código</FormLabel>
        <Input id="client-code" fontFamily="mono" value={value.code} onChange={(e) => onChange({ ...value, code: e.target.value })} maxLength={30} placeholder="UCENTRAL" />
      </FormControl>
      <FormControl isRequired>
        <FormLabel>Nombre</FormLabel>
        <Input id="client-name" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} maxLength={150} placeholder="Universidad Central" />
      </FormControl>
      <Checkbox id="client-onprem" isChecked={value.isOnPremise} onChange={(e) => onChange({ ...value, isOnPremise: e.target.checked })}>
        Instalación en servidores del cliente (on-premise)
      </Checkbox>
      {showActive && (
        <FormControl display="flex" alignItems="center">
          <Switch id="client-active" isChecked={value.isActive} onChange={(e) => onChange({ ...value, isActive: e.target.checked })} />
          <FormLabel htmlFor="client-active" mb={0} ml={3}>
            Activo
          </FormLabel>
        </FormControl>
      )}
    </Stack>
  );
}

export default function ClientsCatalog() {
  const run = useRun();
  const { hasRole } = useContext(AuthContext);
  const isAdmin = hasRole();
  const [clients, setClients] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [edit, setEdit] = useState(null);
  const [newClient, setNewClient] = useState({ code: "", name: "", isOnPremise: false });
  const createModal = useDisclosure();
  const deleteDialog = useDisclosure();

  const load = useCallback(async () => {
    try {
      const [c, i, p] = await Promise.all([listClients(), getInstallations(), listProducts()]);
      setClients(c);
      setInstallations(i);
      setProducts(p);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = clients.find((c) => c.id === openId);
  useEffect(() => {
    if (open) setEdit({ ...open });
  }, [open]);

  const countByClient = useMemo(() => {
    const map = {};
    installations.forEach((i) => {
      map[i.clientId] ??= { total: 0, outdated: 0 };
      map[i.clientId].total++;
      if (i.isOutdated) map[i.clientId].outdated++;
    });
    return map;
  }, [installations]);

  const visible = clients.filter((c) => !search || `${c.name} ${c.code}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Las instituciones que contratan los productos. Desde aquí se asigna a cada cliente qué productos tiene y en qué ambientes."
        actions={
          isAdmin && (
            <Button
              leftIcon={<FiPlus />}
              onClick={() => {
                setNewClient({ code: "", name: "", isOnPremise: false });
                createModal.onOpen();
              }}
            >
              Nuevo cliente
            </Button>
          )
        }
      />
      <Card>
        <Flex p={4}>
          <Input id="clients-search" maxW="300px" placeholder="Buscar por nombre o código" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Flex>
        <Box px={4} pb={4}>
          {loading ? (
            <LoadingRows rows={5} />
          ) : error ? (
            <ErrorBlock message={error} onRetry={load} />
          ) : visible.length === 0 ? (
            <EmptyBlock
              title={clients.length === 0 ? "No hay clientes" : "Ningún cliente coincide"}
              actionLabel={clients.length === 0 && isAdmin ? "Nuevo cliente" : undefined}
              onAction={createModal.onOpen}
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Cliente</Th>
                  <Th>Tipo</Th>
                  <Th>Productos</Th>
                  <Th>Estado</Th>
                </Tr>
              </Thead>
              <Tbody>
                {visible.map((c) => {
                  const counts = countByClient[c.id] ?? { total: 0, outdated: 0 };
                  return (
                    <Tr key={c.id} cursor="pointer" _hover={{ bg: "bg.hover" }} onClick={() => setOpenId(c.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpenId(c.id)}>
                      <Td>
                        <Text fontWeight={600}>{c.name}</Text>
                        <Mono fontSize="xs" color="text.muted">
                          {c.code}
                        </Mono>
                      </Td>
                      <Td>
                        <Text fontSize="sm">{c.isOnPremise ? "On-premise" : "Nube"}</Text>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Text className="tabular" color={counts.total === 0 ? "orange.500" : undefined}>
                            {counts.total === 0 ? "Sin productos" : counts.total}
                          </Text>
                          {counts.outdated > 0 && (
                            <Badge colorScheme="orange" variant="subtle">
                              {counts.outdated} desactualizados
                            </Badge>
                          )}
                        </HStack>
                      </Td>
                      <Td>
                        <Badge colorScheme={c.isActive ? "green" : "gray"} variant="subtle">
                          {c.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </Box>
      </Card>

      <Drawer isOpen={!!open} onClose={() => setOpenId(null)} size="lg">
        <DrawerOverlay />
        <DrawerContent bg="bg.surface">
          <DrawerCloseButton />
          {open && (
            <>
              <DrawerHeader borderBottomWidth="1px" borderColor="border.subtle">
                {open.name}
                <Mono display="block" fontSize="sm" fontWeight={500} color="text.muted">
                  {open.code}
                </Mono>
              </DrawerHeader>
              <DrawerBody>
                <Tabs isLazy>
                  <TabList>
                    <Tab fontWeight={600}>Productos contratados</Tab>
                    <Tab fontWeight={600}>Datos</Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel px={0}>
                      <InstallationsTab client={open} installations={installations} products={products} isAdmin={isAdmin} onChanged={load} />
                    </TabPanel>
                    <TabPanel px={0}>
                      {edit && (
                        <Stack spacing={6}>
                          <ClientForm value={edit} onChange={setEdit} showActive />
                          {isAdmin && (
                            <HStack justify="space-between">
                              <Button variant="ghost" colorScheme="red" leftIcon={<FiTrash2 />} onClick={deleteDialog.onOpen}>
                                Borrar cliente
                              </Button>
                              <Button
                                isDisabled={!edit.code.trim() || !edit.name.trim()}
                                onClick={() => run(() => updateClient(open.id, edit), "Cliente actualizado").then((ok) => ok && load())}
                              >
                                Guardar cambios
                              </Button>
                            </HStack>
                          )}
                        </Stack>
                      )}
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <Modal isOpen={createModal.isOpen} onClose={createModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Nuevo cliente</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <ClientForm value={newClient} onChange={setNewClient} />
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" colorScheme="gray" onClick={createModal.onClose}>
              Volver
            </Button>
            <Button
              isDisabled={!newClient.code.trim() || !newClient.name.trim()}
              onClick={async () => {
                let id;
                const ok = await run(async () => {
                  id = await createClient(newClient);
                }, "Cliente creado");
                if (ok) {
                  createModal.onClose();
                  await load();
                  setOpenId(id);
                }
              }}
            >
              Crear y asignar productos
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.onClose}
        title={`Borrar ${open?.name}`}
        body="Solo se puede borrar si no tiene productos asignados. Si ya tuvo despliegues, desactívalo."
        confirmLabel="Borrar"
        onConfirm={() =>
          run(() => deleteClient(open.id), "Cliente borrado").then((ok) => {
            if (ok) {
              setOpenId(null);
              load();
            }
          })
        }
      />
    </>
  );
}
