import { Link } from "@tanstack/react-router";
import { useAuth, dashboardPath, primaryRole } from "@/lib/auth";

export function SiteHeader() {
  const { user, roles, signOut } = useAuth();
  const role = primaryRole(roles);
  return (
    <header className="relative z-20 border-b border-soil-800/80 bg-soil-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-bio-green shadow-[0_0_8px_var(--color-bio-green)] animate-pulse" />
          <span className="font-heading text-lg font-semibold tracking-tight">Trophic.ai</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 font-data text-xs">
          <div className="flex items-center gap-2">
            <span className="text-soil-600">STATUS:</span>
            <span className="text-bio-green">ROUTING ACTIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to={dashboardPath(role)}
                className="px-4 py-2 font-data text-xs uppercase tracking-wider text-foreground border border-soil-700 hover:border-bio-green hover:text-bio-green transition-colors"
              >
                [ Dashboard ]
              </Link>
              <button
                onClick={() => signOut()}
                className="font-data text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 font-data text-xs uppercase tracking-wider text-foreground border border-soil-700 hover:border-bio-green hover:text-bio-green transition-colors"
            >
              [ INITIALIZE ]
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
