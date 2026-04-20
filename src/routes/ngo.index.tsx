import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, TelemetryCard } from "@/components/app-shell";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, addDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { formatTimeLeft, urgencyLabel, URGENCY_COLORS } from "@/lib/rescue-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/ngo/")({
  component: NGOFeed,
});

interface FeedListing {
  id: string;
  food_type: string;
  description: string | null;
  quantity_kg: number;
  expiry_at: string;
  pickup_address: string;
  dietary_tags: string[];
  urgency_score: number | null;
  urgency_reason: string | null;
  status: string;
  donor_id: string;
}

interface DonorProfile {
  id: string;
  organization_name: string | null;
}

function NGOFeed() {
  const { user } = useAuth();
  const [listings, setListings] = useState<FeedListing[]>([]);
  const [donors, setDonors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "listings"),
        where("status", "==", "active"),
        orderBy("urgency_score", "desc"),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      const items: FeedListing[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as FeedListing);
      });
      setListings(items);

      const donorIds = Array.from(new Set(items.map((l) => l.donor_id)));
      if (donorIds.length) {
        const donorProfiles: Record<string, string> = {};
        for (const id of donorIds) {
          const profDoc = await getDoc(doc(db, "profiles", id));
          if (profDoc.exists()) {
            const data = profDoc.data();
            donorProfiles[id] = data.organization_name ?? "Unknown donor";
          }
        }
        setDonors(donorProfiles);
      }
    } catch (e) {
      console.error("Error loading feed", e);
      toast.error("Failed to sync fleet data.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const accept = async (listing: FeedListing) => {
    if (!user) return;
    setAccepting(listing.id);
    try {
      const batch = writeBatch(db);
      
      // Create match
      const matchRef = doc(collection(db, "matches"));
      batch.set(matchRef, {
        listing_id: listing.id,
        ngo_id: user.uid,
        status: "accepted",
        eta_minutes: 20,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Mark listing matched
      const listingRef = doc(db, "listings", listing.id);
      batch.update(listingRef, { 
        status: "matched",
        updated_at: new Date().toISOString()
      });

      await batch.commit();
      
      toast.success("Pickup accepted. Route locked.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setAccepting(null);
    }
  };

  const critical = listings.filter((l) => urgencyLabel(l.urgency_score) === "critical").length;
  const high = listings.filter((l) => urgencyLabel(l.urgency_score) === "high").length;

  return (
    <AppShell
      requiredRole="ngo"
      title="Recipient terminal"
      subtitle="Live alert feed. Sorted by Gemini urgency score. Tap to accept."
      navItems={[{ to: "/ngo", label: "Alert Feed" }]}
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TelemetryCard label="Active Alerts" value={listings.length} />
          <TelemetryCard label="Critical" value={critical} hint="Act now" />
          <TelemetryCard label="High Priority" value={high} />
          <TelemetryCard label="Network Latency" value="14ms" />
        </div>

        <section className="flex flex-col gap-3">
          {loading ? (
            <p className="font-data text-xs text-soil-600">[ FETCHING ALERTS ]</p>
          ) : listings.length === 0 ? (
            <div className="bg-card border border-soil-800 border-dashed p-10 text-center">
              <p className="font-data text-xs text-soil-600 uppercase mb-2">[ FEED EMPTY ]</p>
              <p className="text-sm text-muted-foreground">
                No active surplus on the network right now. The Gemini core is monitoring 142
                donor nodes — you'll see new alerts here in real time.
              </p>
            </div>
          ) : (
            listings.map((l) => {
              const label = urgencyLabel(l.urgency_score);
              return (
                <article
                  key={l.id}
                  className="bg-card border border-soil-800 p-5 flex flex-col gap-4 hover:border-soil-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={`font-data text-[10px] uppercase tracking-widest px-2 py-0.5 border ${URGENCY_COLORS[label]}`}
                        >
                          {label} · {l.urgency_score ?? "—"}/100
                        </span>
                        <span className="font-data text-xs text-bio-cyan">
                          ⏱ {formatTimeLeft(l.expiry_at)}
                        </span>
                      </div>
                      <h3 className="font-heading text-xl text-foreground">{l.food_type}</h3>
                      <p className="font-data text-xs text-soil-600">
                        {donors[l.donor_id] ?? "Donor"} · {l.quantity_kg} kg · {l.pickup_address}
                      </p>
                    </div>
                    <button
                      onClick={() => accept(l)}
                      disabled={accepting === l.id}
                      className="px-5 py-2.5 bg-bio-green text-soil-950 font-heading font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {accepting === l.id ? "Locking..." : "Accept pickup →"}
                    </button>
                  </div>
                  {l.urgency_reason && (
                    <div className="border-t border-soil-800 pt-3 flex gap-2">
                      <span className="font-data text-[10px] uppercase tracking-widest text-bio-cyan shrink-0">
                        AI:
                      </span>
                      <p className="text-sm text-muted-foreground italic">{l.urgency_reason}</p>
                    </div>
                  )}
                  {l.dietary_tags?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {l.dietary_tags.map((t) => (
                        <span
                          key={t}
                          className="font-data text-[10px] uppercase tracking-wider px-2 py-0.5 border border-soil-700 text-soil-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
      </div>
    </AppShell>
  );
}
