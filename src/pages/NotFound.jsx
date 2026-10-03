import { FiCompass } from "react-icons/fi";
import StatusScreen from "../components/common/StatusScreen";

export default function NotFound() {
  return (
    <StatusScreen
      code={404}
      icon={<FiCompass />}
      title="Esta página no existe"
      description="Puede que el enlace esté mal escrito o que la página se haya movido."
    />
  );
}
