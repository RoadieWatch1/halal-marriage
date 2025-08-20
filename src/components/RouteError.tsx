// C:\Users\vizir\halal-marriage\src\components\RouteError.tsx
import React from "react";
import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
  Link,
  useLocation,
} from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function RouteError() {
  const error = useRouteError() as unknown;
  const navigate = useNavigate();
  const location = useLocation();

  const goHome = () => navigate("/", { replace: true });
  const goBack = () => navigate(-1);
  const reload = () => window.location.reload();

  let title = "Something went wrong";
  let detail: string | undefined;

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    detail = typeof error.data === "string" ? error.data : (error.data?.message ?? undefined);
  } else if (error && typeof error === "object") {
    const e = error as any;
    title = e?.name || title;
    detail = e?.message || detail;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-xl border border-border bg-background/60 backdrop-blur p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
        <p className="text-sm text-muted-foreground break-words">
            {detail ?? "An unexpected error occurred while rendering this page."}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            Path: <code className="px-1 py-0.5 bg-muted rounded">{location.pathname}</code>
          </p>
        </div>

        {process.env.NODE_ENV !== "production" && (
          <details className="text-xs text-muted-foreground bg-muted/30 rounded p-3 whitespace-pre-wrap">
            <summary className="cursor-pointer mb-2">Developer details</summary>
            <pre className="overflow-auto max-h-64">
{String((error as any)?.stack ?? JSON.stringify(error, null, 2))}
            </pre>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button className="theme-button" onClick={goHome}>Go to Home</Button>
          <Button variant="secondary" onClick={goBack}>Go Back</Button>
          <Button variant="outline" onClick={reload}>Reload</Button>
          <Button variant="ghost" asChild>
            <Link to="/upload">Upload Test</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
