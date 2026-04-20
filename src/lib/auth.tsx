import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onIdTokenChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type AppRole = "donor" | "ngo" | "admin";

interface AuthContextValue {
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (uid: string) => {
    try {
      const userRolesDoc = await getDoc(doc(db, "user_roles", uid));
      if (userRolesDoc.exists()) {
        const data = userRolesDoc.data();
        if (data.role) {
          setRoles([data.role as AppRole]);
        } else if (Array.isArray(data.roles)) {
          setRoles(data.roles as AppRole[]);
        }
      }
    } catch (e) {
      console.error("Error fetching roles", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchRoles(currentUser.uid);
      } else {
        setRoles([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setRoles([]);
  };

  const refreshRoles = async () => {
    if (user) await fetchRoles(user.uid);
  };

  return (
    <AuthContext.Provider value={{ user, roles, loading, signOut, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function primaryRole(roles: AppRole[]): AppRole | null {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("ngo")) return "ngo";
  if (roles.includes("donor")) return "donor";
  return null;
}

export function dashboardPath(role: AppRole | null): string {
  if (role === "admin") return "/admin";
  if (role === "ngo") return "/ngo";
  if (role === "donor") return "/donor";
  return "/onboarding";
}
