import { forwardRef, useState } from "react";
import { HStack, IconButton, Input, InputGroup, InputRightElement, Stack, Text } from "@chakra-ui/react";
import { FiCheck, FiCircle, FiEye, FiEyeOff } from "react-icons/fi";
import { PASSWORD_RULES } from "../../helpers/passwords";


/** Campo de contraseña con botón para mostrarla y aviso de Bloq Mayús. */
const PasswordField = forwardRef(function PasswordField({ onKeyUp, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  return (
    <>
      <InputGroup>
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          pr="3rem"
          onKeyUp={(e) => {
            setCapsLock(e.getModifierState?.("CapsLock") ?? false);
            onKeyUp?.(e);
          }}
          {...props}
        />
        <InputRightElement>
          <IconButton
            size="sm"
            variant="ghost"
            colorScheme="gray"
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            icon={visible ? <FiEyeOff /> : <FiEye />}
            onClick={() => setVisible(!visible)}
            tabIndex={-1}
          />
        </InputRightElement>
      </InputGroup>
      {capsLock && (
        <Text fontSize="xs" color="orange.600" mt={1}>
          Bloq Mayús está activado.
        </Text>
      )}
    </>
  );
});

export default PasswordField;

/** Lista de requisitos que se marcan a medida que se escribe. */
export function PasswordChecklist({ value }) {
  return (
    <Stack spacing={1} mt={2}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <HStack key={rule.label} spacing={2} fontSize="xs" color={ok ? "green.600" : "text.muted"}>
            {ok ? <FiCheck /> : <FiCircle size={10} />}
            <Text>{rule.label}</Text>
          </HStack>
        );
      })}
    </Stack>
  );
}
