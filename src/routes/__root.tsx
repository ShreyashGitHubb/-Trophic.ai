import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 ambient-glow">
      <div className="max-w-md text-center">
        <p className="font-data text-xs text-bio-cyan uppercase tracking-widest mb-3">
          [ ROUTE_NOT_FOUND ]
        </p>
        <h1 className="text-7xl font-heading font-medium text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-heading text-foreground">Signal lost</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That node does not exist on the network.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Return to base
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Trophic.ai — Surplus Food Rescue" },
      {
        name: "description",
        content:
          "AI-powered surplus food rescue network. Routing perishable calories from kitchens to community shelters before they become carbon. Powered by Google Gemini.",
      },
      { name: "author", content: "Trophic.ai" },
      { property: "og:title", content: "Trophic.ai — Surplus Food Rescue" },
      {
        property: "og:description",
        content:
          "Autonomous logistics layer connecting restaurants and NGOs in real time. Gemini-powered urgency scoring and matching.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster theme="dark" />
    </AuthProvider>
  );
}
