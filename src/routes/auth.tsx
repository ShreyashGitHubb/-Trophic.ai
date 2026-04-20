import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { auth, db, googleProvider } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
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

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      // Check if user already exists in user_roles
      const rolesDoc = await getDoc(doc(db, "user_roles", fbUser.uid));
      
      if (!rolesDoc.exists()) {
        // New user! If in signup mode, initialize them.
        // If in signin mode, they'll be redirected to onboarding anyway, 
        // but let's try to be helpful if they were just on the signup screen.
        await setDoc(doc(db, "profiles", fbUser.uid), {
          id: fbUser.uid,
          full_name: fbUser.displayName || "",
          organization_name: orgName || "",
          profile_image: fbUser.photoURL || "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        await setDoc(doc(db, "user_roles", fbUser.uid), {
          user_id: fbUser.uid,
          role: selectedRole,
          created_at: new Date().toISOString(),
        });
        
        toast.success(`Node initialized as ${selectedRole}. Welcome.`);
      } else {
        toast.success("Signal authenticated via Google.");
      }
      
      // Redirect happens via useEffect
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google authentication failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

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

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-soil-800"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-soil-600 font-data tracking-widest">
                [ OR CROSS-LINK ]
              </span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-soil-700 text-foreground font-data text-xs uppercase tracking-widest hover:border-bio-green hover:text-bio-green transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

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
