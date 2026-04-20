import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, primaryRole, dashboardPath } from "@/lib/auth";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    const r = primaryRole(roles);
    if (r) navigate({ to: dashboardPath(r) });
  }, [user, roles, loading, navigate]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background ambient-glow">
      <div className="text-center">
        <span className="size-2 rounded-full bg-bio-green inline-block animate-pulse mb-4" />
        <p className="font-data text-sm text-muted-foreground">Routing to your dashboard...</p>
      </div>
    </div>
  );
}
