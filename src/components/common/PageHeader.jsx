import { Box, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

/**
 * Encabezado de página: migas, título, descripción corta y acciones a la derecha.
 * @param {{ title: React.ReactNode, description?: React.ReactNode, actions?: React.ReactNode,
 *           breadcrumbs?: {label: string, to?: string}[], meta?: React.ReactNode }} props
 */
export default function PageHeader({ title, description, actions, breadcrumbs, meta }) {
  return (
    <Box mb={6}>
      {breadcrumbs?.length > 0 && (
        <Breadcrumb fontSize="sm" color="text.muted" mb={2} separator="/">
          {breadcrumbs.map((crumb) => (
            <BreadcrumbItem key={crumb.label} isCurrentPage={!crumb.to}>
              {crumb.to ? (
                <BreadcrumbLink as={RouterLink} to={crumb.to}>
                  {crumb.label}
                </BreadcrumbLink>
              ) : (
                <Text as="span">{crumb.label}</Text>
              )}
            </BreadcrumbItem>
          ))}
        </Breadcrumb>
      )}
      <Flex justify="space-between" align={{ base: "stretch", md: "center" }} gap={4} wrap="wrap">
        {/* Base de 18rem: en pantallas angostas las acciones bajan de línea en vez de aplastar el texto. */}
        <Box minW={0} flex="1 1 18rem">
          <HStack spacing={3} wrap="wrap">
            <Heading size="lg" letterSpacing="-0.02em" sx={{ textWrap: "balance" }}>
              {title}
            </Heading>
            {meta}
          </HStack>
          {description && (
            <Text color="text.muted" mt={1} maxW="70ch">
              {description}
            </Text>
          )}
        </Box>
        {actions && (
          <HStack spacing={2} wrap="wrap">
            {actions}
          </HStack>
        )}
      </Flex>
    </Box>
  );
}
