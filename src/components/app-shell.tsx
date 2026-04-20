import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth, primaryRole, type AppRole } from "@/lib/auth";

interface AppShellProps {
  children: ReactNode;
  requiredRole: AppRole;
  title: string;
  subtitle?: string;
  navItems?: { to: string; label: string }[];
}

export function AppShell({ children, requiredRole, title, subtitle, navItems = [] }: AppShellProps) {
  const { user, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    const role = primaryRole(roles);
    if (role && role !== requiredRole && !roles.includes(requiredRole)) {
      // Wrong role — bounce to their actual dashboard
      navigate({ to: "/" });
    }
  }, [user, roles, loading, navigate, requiredRole]);

  if (loading || !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <span className="font-data text-xs text-soil-600">[ AUTHENTICATING ]</span>
      </div>
    );
  }

  const currentPath = router.state.location.pathname;
  const accent =
    requiredRole === "donor" ? "bio-coral" : requiredRole === "ngo" ? "bio-green" : "bio-purple";
  const accentClasses: Record<string, string> = {
    "bio-coral": "text-bio-coral",
    "bio-green": "text-bio-green",
    "bio-purple": "text-bio-purple",
  };

  return (
    <div className="min-h-dvh bg-background relative">
      <div className="absolute inset-0 ambient-glow pointer-events-none" />
      <header className="relative z-10 border-b border-soil-800 bg-soil-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-bio-green animate-pulse" />
            <span className="font-heading text-lg font-semibold">Trophic.ai</span>
            <span className={`font-data text-[10px] uppercase tracking-widest ${accentClasses[accent]}`}>
              / {requiredRole}
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline font-data text-xs text-soil-600">
              {user.email}
            </span>
            <button
              onClick={() => signOut().then(() => navigate({ to: "/" }))}
              className="font-data text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-1 mb-6">
          <span className={`font-data text-[10px] uppercase tracking-widest ${accentClasses[accent]}`}>
            [ {requiredRole.toUpperCase()} TERMINAL ]
          </span>
          <h1 className="font-heading text-3xl md:text-4xl text-foreground tracking-tight">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        {navItems.length > 0 && (
          <nav className="flex gap-1 mb-8 border-b border-soil-800">
            {navItems.map((item) => {
              const active = currentPath === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-4 py-2.5 font-data text-xs uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                    active
                      ? "border-bio-green text-bio-green"
                      : "border-transparent text-soil-600 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {children}
      </div>
    </div>
  );
}

export function TelemetryCard({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="bg-card border border-soil-800 p-5 telemetry-corners flex flex-col gap-2">
      <span className="font-data text-[10px] uppercase tracking-widest text-soil-600">
        {label}
      </span>
      <div className="font-data text-3xl text-foreground tabular-nums tracking-tight">
        {value}
        {unit && <span className="text-base text-soil-600 ml-1.5">{unit}</span>}
      </div>
      {hint && <span className="font-data text-[10px] text-bio-cyan">{hint}</span>}
    </div>
  );
}
