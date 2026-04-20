import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useAuth, primaryRole, dashboardPath, type AppRole } from "@/lib/auth";
import { toast } from "sonner";

const SearchSchema = z.object({
  role: z.enum(["donor", "ngo", "admin"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const { user, roles, loading } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();

  // Redirect if already signed in
  useEffect(() => {
    if (!loading && user) {
      const role = primaryRole(roles);
      if (role) navigate({ to: dashboardPath(role) });
      else navigate({ to: "/onboarding", search: { role: search.role } });
    }
  }, [user, roles, loading, navigate, search.role]);

  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [selectedRole, setSelectedRole] = useState<AppRole>(search.role ?? "donor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        
        // Update profile
        await updateProfile(fbUser, { displayName: fullName });
        
        // Store profile and role in Firestore
        await setDoc(doc(db, "profiles", fbUser.uid), {
          id: fbUser.uid,
          full_name: fullName,
          organization_name: orgName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        
        await setDoc(doc(db, "user_roles", fbUser.uid), {
          user_id: fbUser.uid,
          role: selectedRole,
          created_at: new Date().toISOString(),
        });

        toast.success("Node initialized. Welcome to the network.");
        navigate({ to: dashboardPath(selectedRole) });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Signal authenticated.");
        // role-based redirect happens via effect in AuthPage
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background relative overflow-hidden flex items-center justify-center px-6 py-12">
      <div className="absolute inset-0 ambient-glow pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <Link
          to="/"
          className="font-data text-xs text-soil-600 hover:text-bio-green transition-colors mb-8 inline-block"
        >
          ← Return to base
        </Link>

        <div className="bg-card border border-soil-800 p-8 telemetry-corners">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-soil-800">
            <span className="font-data text-xs text-soil-600 uppercase tracking-widest">
              [ {mode === "signup" ? "INITIALIZE NODE" : "AUTHENTICATE"} ]
            </span>
            <span className="size-1.5 rounded-full bg-bio-green animate-pulse" />
          </div>

          <h1 className="font-heading text-2xl text-foreground mb-1">
            {mode === "signup" ? "Join the network" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signup"
              ? "Choose your node type to get started."
              : "Sign in to access your dashboard."}
          </p>

          {mode === "signup" && (
            <div className="grid grid-cols-3 gap-2 mb-6">
              {(["donor", "ngo", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`px-3 py-2 font-data text-[11px] uppercase tracking-wider border transition-colors ${
                    selectedRole === r
                      ? "border-bio-green text-bio-green bg-bio-green/5"
                      : "border-soil-700 text-soil-600 hover:border-soil-600"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <>
                <Field
                  label={selectedRole === "donor" ? "Manager name" : "Contact name"}
                  value={fullName}
                  onChange={setFullName}
                  required
                />
                <Field
                  label={
                    selectedRole === "donor"
                      ? "Restaurant / shop name"
                      : selectedRole === "ngo"
                        ? "NGO / shelter name"
                        : "Organization"
                  }
                  value={orgName}
                  onChange={setOrgName}
                  required
                />
              </>
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 px-6 py-3 bg-bio-green text-soil-950 font-heading font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? "Routing..."
                : mode === "signup"
                  ? "Initialize node →"
                  : "Authenticate →"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="mt-6 w-full text-center font-data text-xs text-soil-600 hover:text-bio-green transition-colors"
          >
            {mode === "signup"
              ? "Already on the network? Sign in →"
              : "New to the network? Initialize a node →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-data text-[10px] uppercase tracking-widest text-soil-600">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="bg-input border border-soil-700 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-bio-green transition-colors"
      />
    </label>
  );
}
