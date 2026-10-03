import { useCallback, useContext, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  FormControl,
  FormHelperText,
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
  Stack,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import Mono from "../common/Mono";
import PageHeader from "../common/PageHeader";
import ConfirmDialog from "../common/ConfirmDialog";
import { EmptyBlock, ErrorBlock, LoadingRows } from "../common/DataState";
import { AuthContext } from "../../context/AuthContext";
import { createEnvironment, deleteEnvironment, listEnvironments, updateEnvironment } from "../../services/catalog";
import { apiErrorMessage } from "../../services/api";

export default function EnvironmentsCatalog() {
  const toast = useToast();
  const { hasRole } = useContext(AuthContext);
  const isAdmin = hasRole();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null); // { id?, code, name, isActive }
  const [toDelete, setToDelete] = useState(null);
  const formModal = useDisclosure();

  const load = useCallback(async () => {
    try {
      setItems(await listEnvironments());
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

  const openForm = (env) => {
    setForm(env ? { ...env } : { code: "", name: "", isActive: true });
    formModal.onOpen();
  };

  const save = async () => {
    try {
      if (form.id) await updateEnvironment(form.id, form);
      else await createEnvironment(form);
      toast({ title: form.id ? "Ambiente actualizado" : "Ambiente creado", status: "success" });
      formModal.onClose();
      load();
    } catch (err) {
      toast({ title: "No se pudo guardar", description: apiErrorMessage(err), status: "error" });
    }
  };

  return (
    <>
    <PageHeader
      title="Ambientes"
      description="Dónde se despliega cada producto (por ejemplo DEV, TEST y PROD). Cada ambiente se asigna a los productos desde Productos."
      actions={
        isAdmin && (
          <Button leftIcon={<FiPlus />} onClick={() => openForm(null)}>
            Nuevo ambiente
          </Button>
        )
      }
    />
    <Card>
      <Box p={4}>
        {loading ? (
          <LoadingRows rows={4} />
        ) : error ? (
          <ErrorBlock message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyBlock
            title="No hay ambientes"
            description="Crea los ambientes donde se despliega (por ejemplo DEV, TEST y PROD)."
            actionLabel={isAdmin ? "Nuevo ambiente" : undefined}
            onAction={() => openForm(null)}
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Código</Th>
                <Th>Nombre</Th>
                <Th>Estado</Th>
                {isAdmin && <Th w="100px" />}
              </Tr>
            </Thead>
            <Tbody>
              {items.map((env) => (
                <Tr key={env.id}>
                  <Td>
                    <Mono fontWeight={700}>{env.code}</Mono>
                  </Td>
                  <Td>{env.name}</Td>
                  <Td>
                    <Badge colorScheme={env.isActive ? "green" : "gray"} variant="subtle">
                      {env.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </Td>
                  {isAdmin && (
                    <Td>
                      <HStack justify="flex-end" spacing={1}>
                        <IconButton size="sm" variant="ghost" colorScheme="gray" aria-label="Editar" icon={<FiEdit2 />} onClick={() => openForm(env)} />
                        <IconButton size="sm" variant="ghost" colorScheme="red" aria-label="Borrar" icon={<FiTrash2 />} onClick={() => setToDelete(env)} />
                      </HStack>
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>

      <Modal isOpen={formModal.isOpen} onClose={formModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{form?.id ? "Editar ambiente" : "Nuevo ambiente"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {form && (
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Código</FormLabel>
                  <Input id="env-code" fontFamily="mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="PROD" maxLength={20} />
                  <FormHelperText>Se guarda en mayúsculas.</FormHelperText>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Nombre</FormLabel>
                  <Input id="env-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Producción" maxLength={100} />
                </FormControl>
                {form.id && (
                  <FormControl display="flex" alignItems="center">
                    <Switch id="env-active" isChecked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                    <FormLabel htmlFor="env-active" mb={0} ml={3}>
                      Activo
                    </FormLabel>
                  </FormControl>
                )}
              </Stack>
            )}
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" colorScheme="gray" onClick={formModal.onClose}>
              Volver
            </Button>
            <Button onClick={save} isDisabled={!form?.code?.trim() || !form?.name?.trim()}>
              Guardar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        title={`Borrar ${toDelete?.code}`}
        body={<Text>Solo se puede borrar si ningún producto lo usa. Si ya está en uso, desactívalo.</Text>}
        confirmLabel="Borrar"
        onConfirm={async () => {
          try {
            await deleteEnvironment(toDelete.id);
            toast({ title: "Ambiente borrado", status: "success" });
            load();
          } catch (err) {
            toast({ title: "No se pudo borrar", description: apiErrorMessage(err), status: "error" });
          }
        }}
      />
    </Card>
    </>
  );
}
