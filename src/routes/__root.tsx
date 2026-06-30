import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster as SonnerToaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { name: "google-site-verification", content: "tbza8oQV5Q94J94ETfj9TDnV7gI8eoXIAF6q9nctPnQ" },
      { title: "Jenvu AI — Voice-Powered Institutional Trading Intelligence" },
      { name: "description", content: "Voice-native AI trading terminal for Gold, Crypto, FX & Indices. Live ICT/SMC analysis, A+ setups, and spoken execution built on 25+ years of institutional logic." },
      { name: "author", content: "Jenvu AI" },
      { name: "theme-color", content: "#000000" },
      { property: "og:site_name", content: "Jenvu AI" },
      { property: "og:title", content: "Jenvu AI — Voice-Powered Institutional Trading Intelligence" },
      { property: "og:description", content: "Speak. Analyze. Execute. The voice terminal that turns market noise into institutional-grade signals." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/afb81f86-c6e3-4892-b81f-eb551ed99e17/id-preview-cf5425ce--06cd4260-299b-4286-8096-c43f2f596dee.lovable.app-1782731006346.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Jenvu AI — Voice-Powered Institutional Trading Intelligence" },
      { name: "twitter:description", content: "Speak. Analyze. Execute. The voice terminal that turns market noise into institutional-grade signals." },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/afb81f86-c6e3-4892-b81f-eb551ed99e17/id-preview-cf5425ce--06cd4260-299b-4286-8096-c43f2f596dee.lovable.app-1782731006346.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://jenvu.com/#org",
              name: "Jenvu AI",
              url: "https://jenvu.com",
              logo: "https://jenvu.com/favicon.png",
            },
            {
              "@type": "WebSite",
              "@id": "https://jenvu.com/#website",
              url: "https://jenvu.com",
              name: "Jenvu AI",
              publisher: { "@id": "https://jenvu.com/#org" },
              potentialAction: {
                "@type": "SearchAction",
                target: "https://jenvu.com/signal?symbol={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700;800;900&display=swap" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Manrope:wght@300;400;500;600;700;800&display=swap" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300;1,6..72,400&display=swap" },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Native (Capacitor) bootstrap: status bar + hide splash. No-op on web.
    import("../lib/native/bootstrap")
      .then((m) => m.bootstrapNative())
      .catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <SonnerToaster theme="light" position="top-right" toastOptions={{ style: { background: "#ffffff", color: "#000000", border: "1px solid #e4e4e7" } }} />
    </QueryClientProvider>
  );
}
