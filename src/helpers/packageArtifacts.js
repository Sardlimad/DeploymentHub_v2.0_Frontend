/** Convierte la lista del editor de artefactos al formato de POST /DeploymentPackages. */
export function toPackageArtifacts(items) {
  return items.map((item, index) =>
    item.productArtifactId
      ? { productArtifactId: item.productArtifactId, executionOrder: index + 1, notes: item.notes || null }
      : {
          type: item.type,
          code: item.code,
          name: item.name || item.code,
          path: item.path || null,
          executionOrder: index + 1,
          notes: item.notes || null,
        }
  );
}
