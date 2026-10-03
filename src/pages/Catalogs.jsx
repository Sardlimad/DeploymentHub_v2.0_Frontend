import { Navigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import ProductsCatalog from "../components/catalog/ProductsCatalog";
import ClientsCatalog from "../components/catalog/ClientsCatalog";
import EnvironmentsCatalog from "../components/catalog/EnvironmentsCatalog";

const SECTIONS = {
  products: ProductsCatalog,
  clients: ClientsCatalog,
  environments: EnvironmentsCatalog,
};

/** Catálogo: productos, clientes y ambientes, cada uno en su propia ruta (/catalogs/:section). */
export default function Catalogs() {
  const { section } = useParams();
  const Section = SECTIONS[section];
  if (!Section) return <Navigate to="/catalogs/products" replace />;

  return (
    <Layout>
      <Section />
    </Layout>
  );
}
