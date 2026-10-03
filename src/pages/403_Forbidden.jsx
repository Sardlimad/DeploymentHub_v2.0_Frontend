import { FiLock } from "react-icons/fi";
import StatusScreen from "../components/common/StatusScreen";

export default function Forbidden() {
  return (
    <StatusScreen
      code={403}
      icon={<FiLock />}
      title="Tu rol no tiene acceso a esta sección"
      description="Si necesitas entrar aquí, pídele a un administrador que revise tu rol."
    />
  );
}
