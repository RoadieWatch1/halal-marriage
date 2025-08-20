// C:\Users\vizir\halal-marriage\src\main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Link } from "react-router-dom";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";           // layout shell with <Outlet />
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import QuickUpload from "@/components/QuickUpload";
import RequireAuth from "@/components/RequireAuth";
import RouteError from "@/components/RouteError";
import "./index.css";

const queryClient = new QueryClient();

// Small page to exercise uploads
function UploadPage() {
  return (
    <div className="min-h-screen p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Upload Test</h1>
        <Link to="/" className="underline">Back to Home</Link>
      </header>
      <p className="text-sm text-muted-foreground">
        You must be logged in to upload. Files go to
        <code className="mx-1">profile-media/&lt;your-user-id&gt;/...</code>.
      </p>
      <QuickUpload />
    </div>
  );
}

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,              // layout with <Outlet />
      errorElement: <RouteError />,  // graceful crash UI
      children: [
        { index: true, element: <Index /> },
        {
          path: "upload",
          element: (
            <RequireAuth>
              <UploadPage />
            </RequireAuth>
          ),
        },
        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  {
    // Allowed here; silences the "relative splat" warning
    future: { v7_relativeSplatPath: true },
  }
);

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error('Root element with id "root" was not found.');

createRoot(rootEl).render(
  <React.StrictMode>
    {/* Providers ABOVE Router so everything (e.g., Sonner) sees ThemeProvider */}
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
