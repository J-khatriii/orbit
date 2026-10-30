import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";
import { queryClient } from "./app/queryClient.js";
import { router } from "./app/router.jsx";
import { ToastProvider } from "./components/ui/index.js";
import { AuthProvider } from "./features/auth/AuthProvider.jsx";

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
