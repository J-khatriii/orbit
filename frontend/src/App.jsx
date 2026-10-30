import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";
import { queryClient } from "./app/queryClient.js";
import { router } from "./app/router.jsx";
import { ToastProvider } from "./components/ui/index.js";

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
