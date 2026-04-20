import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, TelemetryCard } from "@/components/app-shell";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { formatTimeLeft, urgencyLabel, URGENCY_COLORS } from "@/lib/rescue-utils";

export const Route = createFileRoute("/donor/")({
  component: DonorHome,
});

interface Listing {
  id: string;
  food_type: string;
  quantity_kg: number;
  expiry_at: string;
  status: string;
  urgency_score: number | null;
  pickup_address: string;
  created_at: string;
}

function DonorHome() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const q = query(
          collection(db, "listings"),
          where("donor_id", "==", user.uid),
          orderBy("created_at", "desc"),
          limit(20)
        );
        const querySnapshot = await getDocs(q);
        const items: Listing[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as Listing);
        });
        setListings(items);
      } catch (e) {
        console.error("Error loading donor listings", e);
      }
      setLoading(false);
    })();
  }, [user]);

  const totalKg = listings.reduce((s, l) => s + Number(l.quantity_kg), 0);
  const active = listings.filter((l) => l.status === "active" || l.status === "matched").length;
  const completed = listings.filter((l) => l.status === "completed").length;

  return (
    <AppShell
      requiredRole="donor"
      title="Donor terminal"
      subtitle="Inject surplus into the network. The Gemini core will route it."
      navItems={[
        { to: "/donor", label: "Overview" },
        { to: "/donor/new", label: "+ Inject Surplus" },
      ]}
    >
      <div className="flex flex-col gap-8">
        {/* AI prediction banner */}
        <div className="bg-card border border-bio-cyan/30 p-6 relative">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex flex-col gap-2 max-w-xl">
              <span className="font-data text-[10px] uppercase tracking-widest text-bio-cyan">
                [ GEMINI · DAILY SURPLUS PREDICTION ]
              </span>
              <h3 className="font-heading text-xl text-foreground">
                Likely surplus today: ~12-15 kg between 21:30 - 22:30
              </h3>
              <p className="text-sm text-muted-foreground">
                Based on your last 14 days of activity, expect leftover prepared meals near
                close-of-service. Pre-listing reduces routing latency by ~40%.
              </p>
            </div>
            <Link
              to="/donor/new"
              className="px-5 py-2.5 bg-bio-cyan text-soil-950 font-heading font-medium hover:opacity-90 transition-opacity self-start"
            >
              Pre-list now →
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TelemetryCard label="Total Listings" value={listings.length} />
          <TelemetryCard label="Mass Injected" value={totalKg.toFixed(1)} unit="kg" />
          <TelemetryCard label="Active in Routing" value={active} hint="In transit" />
          <TelemetryCard label="Completed" value={completed} />
        </div>

        {/* Listings */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl text-foreground">Your listings</h2>
            <Link
              to="/donor/new"
              className="font-data text-xs uppercase tracking-wider text-bio-green hover:opacity-80"
            >
              + Inject new surplus
            </Link>
          </div>

          {loading ? (
            <p className="font-data text-xs text-soil-600">[ LOADING ]</p>
          ) : listings.length === 0 ? (
            <div className="bg-card border border-soil-800 border-dashed p-10 text-center">
              <p className="font-data text-xs text-soil-600 uppercase mb-2">
                [ NO PAYLOAD INJECTED ]
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                You haven't listed any surplus yet. Inject your first payload to start routing.
              </p>
              <Link
                to="/donor/new"
                className="inline-block px-5 py-2.5 bg-bio-green text-soil-950 font-heading font-medium hover:opacity-90"
              >
                Inject surplus →
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {listings.map((l) => {
                const label = urgencyLabel(l.urgency_score);
                return (
                  <div
                    key={l.id}
                    className="bg-card border border-soil-800 p-4 flex flex-wrap items-center gap-4 hover:border-soil-700 transition-colors"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-heading text-base text-foreground">{l.food_type}</h3>
                        <span
                          className={`font-data text-[10px] uppercase tracking-widest px-2 py-0.5 border ${URGENCY_COLORS[label]}`}
                        >
                          {label} · {l.urgency_score ?? "—"}
                        </span>
                      </div>
                      <p className="font-data text-xs text-soil-600">
                        {l.quantity_kg} kg · {formatTimeLeft(l.expiry_at)} ·{" "}
                        <span className="text-bio-cyan">{l.status}</span>
                      </p>
                    </div>
                    <span className="font-data text-xs text-soil-600 truncate max-w-xs">
                      {l.pickup_address}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
