import { createContext, useContext } from "react";
import { useDisclosure } from "@chakra-ui/react";

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
  const disclosure = useDisclosure();
  return (
    <SidebarContext.Provider value={disclosure}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
