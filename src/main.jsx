import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import "./index.css";
import defaultTheme from "./themes/default";
import { SidebarProvider } from "./context/SidebarContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChakraProvider
      theme={defaultTheme}
      toastOptions={{
        defaultOptions: {
          position: "bottom-right",
          duration: 3000,
          isClosable: true,
        },
      }}
    >
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </ChakraProvider>
  </React.StrictMode>
);
