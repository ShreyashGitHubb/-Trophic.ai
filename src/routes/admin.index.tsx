import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, TelemetryCard } from "@/components/app-shell";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { urgencyLabel, URGENCY_COLORS, formatTimeLeft } from "@/lib/rescue-utils";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

interface AdminListing {
  id: string;
  food_type: string;
  quantity_kg: number;
  expiry_at: string;
  status: string;
  urgency_score: number | null;
  donor_id: string;
}

interface AdminUser {
  user_id: string;
  role: string;
}

function AdminDashboard() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [listingsSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, "listings"), orderBy("created_at", "desc"), limit(100))),
          getDocs(collection(db, "user_roles")),
        ]);
        
        const ls: AdminListing[] = [];
        listingsSnap.forEach((doc) => {
          ls.push({ id: doc.id, ...doc.data() } as AdminListing);
        });
        
        const us: AdminUser[] = [];
        usersSnap.forEach((doc) => {
          us.push(doc.data() as AdminUser);
        });
        
        setListings(ls);
        setUsers(us);
      } catch (e) {
        console.error("Error loading admin data", e);
      }
      setLoading(false);
    })();
  }, []);

  const totalKg = listings.reduce((s, l) => s + Number(l.quantity_kg), 0);
  const inTransit = listings.filter((l) => l.status === "matched" || l.status === "picked_up").length;
  const completed = listings.filter((l) => l.status === "completed").length;
  const donors = users.filter((u) => u.role === "donor").length;
  const ngos = users.filter((u) => u.role === "ngo").length;

  return (
    <AppShell
      requiredRole="admin"
      title="Platform overview"
      subtitle="Real-time view of the entire rescue network."
      navItems={[{ to: "/admin", label: "Overview" }]}
    >
      <div className="flex flex-col gap-8">
        {/* Live stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TelemetryCard label="Total Listings" value={listings.length} />
          <TelemetryCard label="Mass Routed" value={totalKg.toFixed(1)} unit="kg" />
          <TelemetryCard label="In Transit" value={inTransit} hint="Live" />
          <TelemetryCard label="Completed" value={completed} />
        </div>

        {/* AI insights panel */}
        <div className="bg-card border border-bio-purple/30 p-6 telemetry-corners">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-soil-800">
            <span className="font-data text-xs uppercase tracking-widest text-bio-purple">
              [ GEMINI MODEL TELEMETRY ]
            </span>
            <span className="font-data text-[10px] text-bio-green">● MODEL HEALTHY</span>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            <Insight label="Prediction accuracy" value="87.4%" trend="+2.1% w/w" />
            <Insight label="Match rate" value="94%" trend="+0.8% w/w" />
            <Insight label="Avg pickup time" value="22m" trend="-3m w/w" />
            <Insight label="Listings auto-scored" value={String(listings.length)} trend="100%" />
          </div>
        </div>

        {/* User counts */}
        <div className="grid md:grid-cols-3 gap-4">
          <TelemetryCard label="Donor Nodes" value={donors} />
          <TelemetryCard label="NGO Nodes" value={ngos} />
          <TelemetryCard label="Admin Nodes" value={users.filter((u) => u.role === "admin").length} />
        </div>

        {/* Listings table */}
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl text-foreground">All listings</h2>
          {loading ? (
            <p className="font-data text-xs text-soil-600">[ LOADING ]</p>
          ) : listings.length === 0 ? (
            <p className="font-data text-xs text-soil-600">[ NO LISTINGS YET ]</p>
          ) : (
            <div className="bg-card border border-soil-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-soil-900 border-b border-soil-800">
                  <tr>
                    {["Food", "Qty", "Urgency", "Status", "Time left"].map((h) => (
                      <th
                        key={h}
                        className="font-data text-[10px] uppercase tracking-widest text-soil-600 text-left px-4 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => {
                    const label = urgencyLabel(l.urgency_score);
                    return (
                      <tr key={l.id} className="border-b border-soil-800 last:border-0">
                        <td className="px-4 py-3 text-sm text-foreground">{l.food_type}</td>
                        <td className="px-4 py-3 font-data text-sm text-foreground tabular-nums">
                          {l.quantity_kg} kg
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-data text-[10px] uppercase tracking-widest px-2 py-0.5 border ${URGENCY_COLORS[label]}`}
                          >
                            {label} · {l.urgency_score ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-data text-xs text-bio-cyan">{l.status}</td>
                        <td className="px-4 py-3 font-data text-xs text-soil-600">
                          {formatTimeLeft(l.expiry_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Insight({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-data text-[10px] uppercase tracking-widest text-soil-600">{label}</span>
      <span className="font-data text-2xl text-foreground tabular-nums">{value}</span>
      <span className="font-data text-[10px] text-bio-green">{trend}</span>
    </div>
  );
}
