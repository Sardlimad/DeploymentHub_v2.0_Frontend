import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import recorridos from "./recorridos.json";

/*
  KRUD, el asistente transversal, montado en DeploymentHub.

  El kit NO se copia aquí: se carga por URL desde el servidor de KRUD, así todas las aplicaciones
  usan la misma versión. DeploymentHub aporta solo lo suyo:
    - quién es (applicationId);
    - dónde está cada control de sus recorridos y cómo avanza cada paso (objetivos);
    - quién firma al usuario: el backend, en GET /api/krud/asercion, con la sesión actual.

  Sin VITE_KRUD_ORIGEN, o si KRUD no responde, no se monta nada y DeploymentHub sigue igual.
*/
const ORIGEN = (import.meta.env.VITE_KRUD_ORIGEN ?? "").replace(/\/$/, "");

// Los selectores se quedan en la aplicación; el catálogo publicado solo lleva títulos y textos.
const objetivos = Object.fromEntries(
  recorridos.recorridos.map((r) => [r.id, { pasos: r.pasos.map((p) => p.objetivo), fin: r.fin }])
);

// El kit pide una aserción nueva por cada ticket. Si el firmador está apagado (404), KRUD no arranca.
async function pedirAsercion() {
  try {
    const { data } = await API.get("/krud/asercion", { responseType: "text", headers: { Accept: "text/plain" } });
    return typeof data === "string" && data ? data : null;
  } catch {
    return null;
  }
}

export default function KrudAsistente() {
  // useNavigate devuelve una función nueva en cada cambio de ruta. Si el efecto dependiera de ella,
  // al navegar (p. ej. «Llévame» de una guía) se retiraría el kit y la guía en curso se cerraría.
  // Por eso el kit se monta una sola vez por sesión y navega con la función más reciente.
  const navigate = useNavigate();
  const navegarRef = useRef(navigate);
  navegarRef.current = navigate;

  useEffect(() => {
    if (!ORIGEN) return undefined;
    let vivo = true;
    let retirar;
    let hoja;

    // Solo se monta si el backend puede firmar al usuario: con el firmador apagado (404) el panel se
    // quedaría «Conectando…» sin explicar nada. La aserción de esta comprobación no se usa y vence sola.
    pedirAsercion()
      .then((asercion) => {
        if (!vivo || !asercion) return null;
        hoja = document.createElement("link");
        hoja.rel = "stylesheet";
        hoja.href = `${ORIGEN}/integration-kit/velo-kit.css`;
        document.head.appendChild(hoja);
        return import(/* @vite-ignore */ `${ORIGEN}/integration-kit/velo-kit.js`);
      })
      .then((kit) => {
        if (!vivo || !kit) return;
        retirar = kit.instalarKrud({
          applicationId: recorridos.applicationId,
          origen: ORIGEN,
          base: "",
          objetivos,
          token: pedirAsercion,
          // Las rutas de DeploymentHub ya están en minúsculas: coinciden con las del catálogo.
          navegar: (ruta) => navegarRef.current(ruta),
        });
      })
      .catch(() => {
        /* Sin KRUD, DeploymentHub sigue funcionando igual. */
      });

    return () => {
      vivo = false;
      if (retirar) retirar();
      hoja?.remove();
    };
  }, []);

  return null;
}
