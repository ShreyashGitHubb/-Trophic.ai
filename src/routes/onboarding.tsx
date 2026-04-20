import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, primaryRole, dashboardPath, type AppRole } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, roles, loading, refreshRoles } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<AppRole>("donor");
  const [orgName, setOrgName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    const r = primaryRole(roles);
    if (r) {
      navigate({ to: dashboardPath(r) });
    } else {
      // User is logged in but has no role. Show the fallback UI.
      setShowRoleSelection(true);
    }
  }, [user, roles, loading, navigate]);

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      // Create user profile
      await setDoc(doc(db, "profiles", user.uid), {
        id: user.uid,
        full_name: user.displayName || "",
        organization_name: orgName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Assign the role
      await setDoc(doc(db, "user_roles", user.uid), {
        user_id: user.uid,
        role: selectedRole,
        created_at: new Date().toISOString(),
      });

      toast.success(`Node initialized as ${selectedRole}. Routing to dashboard.`);
      
      // Refresh context and let the useEffect handle the redirect
      await refreshRoles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to initialize node");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (!showRoleSelection && !primaryRole(roles))) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background ambient-glow">
        <div className="text-center">
          <span className="size-2 rounded-full bg-bio-green inline-block animate-pulse mb-4" />
          <p className="font-data text-sm text-muted-foreground tracking-widest">[ ROUTING... ]</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background relative overflow-hidden px-6">
      <div className="absolute inset-0 ambient-glow pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md bg-card border border-soil-800 p-8 telemetry-corners">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-soil-800">
          <span className="font-data text-xs text-soil-600 uppercase tracking-widest">
            [ NODE_INITIALIZATION ]
          </span>
          <span className="size-1.5 rounded-full bg-bio-cyan animate-pulse" />
        </div>

        <h1 className="font-heading text-2xl text-foreground mb-1">Finalize your connection</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Your credentials are authenticated. Now, identify your node type on the network.
        </p>

        <form onSubmit={handleCompleteOnboarding} className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-2">
            {(["donor", "ngo", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRole(r)}
                className={`px-3 py-2 font-data text-[10px] uppercase tracking-wider border transition-colors ${
                  selectedRole === r
                    ? "border-bio-green text-bio-green bg-bio-green/5"
                    : "border-soil-700 text-soil-600 hover:border-soil-600"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-data text-[10px] uppercase tracking-widest text-soil-600">
              {selectedRole === "donor" ? "Shop / Restaurant Name" : "Organization Name"}
            </span>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              placeholder="e.g. Green Kitchen, Hope Shelter"
              className="bg-input border border-soil-700 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-bio-green transition-colors"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-bio-green text-soil-950 font-heading font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "INITIALIZING..." : "Complete Setup →"}
          </button>
        </form>
      </div>
    </div>
  );
}
