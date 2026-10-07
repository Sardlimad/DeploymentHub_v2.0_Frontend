/*
  Arnés para probar las guías de KRUD sin pasar por la conversación (y sin gastar el modelo).

  Usa el MISMO motor que el panel —componerRecorrido + mostrarGuia del kit— con el catálogo publicado
  y los objetivos de la aplicación. Se pega en la consola del navegador con la aplicación abierta
  (sesión iniciada) en la pantalla del primer paso:

    const h = await (await import('/src/integraciones/krud/pruebas/arnes-guias.js')).crearArnes();
    h.lanzar('crear-solicitud');   // y luego hacer los pasos a mano o por código
    h.estado();                    // { paso: '3 / 9', titulo, noEncuentra } o { abierta:false, cierres }

  Límite: el paso de llegada («Llévame») lo añade instalarKrud y no se exporta; se prueba por
  conversación. No se importa desde la aplicación: es solo una herramienta de prueba.
*/
import recorridos from "../recorridos.json";

export async function crearArnes(origenDelKit = import.meta.env.VITE_KRUD_ORIGEN) {
  const kit = await import(/* @vite-ignore */ `${origenDelKit}/integration-kit/velo-kit.js`);
  const objetivos = Object.fromEntries(recorridos.recorridos.map((r) => [r.id, { pasos: r.pasos.map((p) => p.objetivo), fin: r.fin }]));
  const catalogo = await (await fetch(`/velo-assistant/${recorridos.applicationId}.support.v1.json`, { cache: "no-store" })).json();
  const cierres = [];
  let cerrar;

  return {
    kit,
    cierres,
    lanzar(id) {
      cerrar?.();
      const recorrido = kit.componerRecorrido(catalogo, id, objetivos);
      if (!recorrido) throw new Error(`El catálogo no tiene la guía «${id}».`);
      cerrar = kit.mostrarGuia(recorrido, {
        base: "",
        onNavegar: (ruta) => {
          history.pushState({}, "", ruta);
          dispatchEvent(new PopStateEvent("popstate"));
        },
        onCerrar: (motivo) => cierres.push(motivo),
      });
      return recorrido.pasos.length;
    },
    cerrar: () => cerrar?.(),
    estado() {
      const cartel = document.querySelector(".krud-guia-cartel");
      if (!cartel) return { abierta: false, cierres: [...cierres] };
      const texto = cartel.innerText.replace(/\s+/g, " ").trim();
      return {
        paso: (texto.match(/^(\d+) \/ (\d+)/) || [])[0],
        titulo: texto.split("×")[1]?.trim().slice(0, 60),
        noEncuentra: texto.includes("No encuentro"),
      };
    },
  };
}
