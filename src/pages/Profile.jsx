import { useContext, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Heading,
  HStack,
  List,
  ListIcon,
  ListItem,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { FiCheckCircle, FiLock, FiLogOut } from "react-icons/fi";
import Layout from "../components/Layout";
import PageHeader from "../components/common/PageHeader";
import PasswordField, { PasswordChecklist } from "../components/auth/PasswordField";
import { isStrongPassword } from "../helpers/passwords";
import { AuthContext } from "../context/AuthContext";
import { changePassword } from "../services/auth";
import { apiErrorMessage } from "../services/api";
import { RoleAbilities, RoleColors, RoleLabels } from "../helpers/roles";

const EMPTY = { current: "", next: "", confirm: "" };

export default function Profile() {
  const { user, logout } = useContext(AuthContext);
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const mismatch = form.confirm.length > 0 && form.confirm !== form.next;
  const sameAsCurrent = form.next.length > 0 && form.next === form.current;
  const canSave = form.current && isStrongPassword(form.next) && form.next === form.confirm && !sameAsCurrent;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await changePassword({ currentPassword: form.current, newPassword: form.next });
      toast({ title: "Contraseña actualizada", description: "La usarás la próxima vez que entres.", status: "success" });
      setForm(EMPTY);
    } catch (err) {
      toast({ title: "No se pudo cambiar la contraseña", description: apiErrorMessage(err), status: "error" });
    } finally {
      setSaving(false);
    }
  };

  const role = user?.role;

  return (
    <Layout>
      <PageHeader title="Mi perfil" description="Tus datos de acceso y lo que tu rol te permite hacer." />

      <Grid templateColumns={{ base: "1fr", lg: "minmax(0, 1fr) minmax(0, 1.2fr)" }} gap={5} alignItems="start">
        <Stack spacing={5}>
          <Card>
            <CardBody>
              <HStack spacing={4} align="center">
                <Avatar size="lg" name={user?.name} bg="brand.600" color="white" />
                <Box minW={0}>
                  <Heading size="md" noOfLines={1}>
                    {user?.name}
                  </Heading>
                  <Text color="text.muted" noOfLines={1}>
                    {user?.email}
                  </Text>
                  <Badge mt={2} colorScheme={RoleColors[role] ?? "gray"}>
                    {RoleLabels[role] ?? role}
                  </Badge>
                </Box>
              </HStack>
              <Text fontSize="sm" color="text.muted" mt={4}>
                Tu nombre, correo y rol los cambia un administrador.
              </Text>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Heading size="sm" mb={3}>
                Con tu rol puedes
              </Heading>
              <List spacing={2} fontSize="sm">
                {(RoleAbilities[role] ?? []).map((ability) => (
                  <ListItem key={ability} display="flex" alignItems="flex-start">
                    <ListIcon as={FiCheckCircle} color="green.500" mt={0.5} />
                    {ability}
                  </ListItem>
                ))}
              </List>
              <Button mt={5} variant="outline" colorScheme="red" size="sm" leftIcon={<FiLogOut />} onClick={logout}>
                Cerrar sesión
              </Button>
            </CardBody>
          </Card>
        </Stack>

        <Card>
          <CardBody as="form" onSubmit={submit} noValidate>
            <HStack spacing={2} mb={1}>
              <FiLock />
              <Heading size="sm">Cambiar contraseña</Heading>
            </HStack>
            <Text fontSize="sm" color="text.muted" mb={5}>
              Si no recuerdas la actual, cierra sesión y usa «¿La olvidaste?».
            </Text>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Contraseña actual</FormLabel>
                <PasswordField autoComplete="current-password" value={form.current} onChange={set("current")} />
              </FormControl>
              <FormControl isRequired isInvalid={sameAsCurrent}>
                <FormLabel>Nueva contraseña</FormLabel>
                <PasswordField autoComplete="new-password" value={form.next} onChange={set("next")} />
                <FormErrorMessage>Debe ser distinta de la actual.</FormErrorMessage>
                <PasswordChecklist value={form.next} />
              </FormControl>
              <FormControl isRequired isInvalid={mismatch}>
                <FormLabel>Repite la nueva contraseña</FormLabel>
                <PasswordField autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
                <FormErrorMessage>No coincide con la nueva contraseña.</FormErrorMessage>
              </FormControl>
              <HStack justify="flex-end" pt={2}>
                <Button variant="ghost" colorScheme="gray" onClick={() => setForm(EMPTY)} isDisabled={saving}>
                  Limpiar
                </Button>
                <Button type="submit" isLoading={saving} loadingText="Guardando" isDisabled={!canSave}>
                  Guardar contraseña
                </Button>
              </HStack>
            </Stack>
          </CardBody>
        </Card>
      </Grid>
    </Layout>
  );
}
