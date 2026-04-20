import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trophic.ai — Routing surplus calories before they become carbon" },
      {
        name: "description",
        content:
          "AI-powered surplus food rescue. Trophic.ai uses Google Gemini to predict surplus, score urgency, and route perishables from kitchens to NGOs in milliseconds.",
      },
      { property: "og:title", content: "Trophic.ai — Surplus Food Rescue Network" },
      {
        property: "og:description",
        content:
          "Autonomous logistics layer for urban food systems. Powered by Gemini and the Google ecosystem.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 ambient-glow pointer-events-none" />
      <SiteHeader />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 lg:py-28 flex flex-col gap-32">
        {/* HERO */}
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-16 items-center">
          <div className="flex flex-col gap-8">
            <div className="inline-flex items-center gap-2 border border-soil-700 bg-soil-900/60 px-3 py-1 self-start">
              <span className="font-data text-[10px] uppercase tracking-widest text-bio-cyan">
                Protocol v2.4 &middot; Powered by Gemini
              </span>
            </div>
            <h1 className="font-heading text-5xl md:text-7xl font-medium tracking-tight leading-[1.05] text-balance">
              Routing surplus calories before they become{" "}
              <span className="text-soil-600">carbon.</span>
            </h1>
            <p className="text-lg max-w-[55ch] text-carbon text-pretty">
              The autonomous logistics layer for urban food systems. We treat food waste not
              as charity, but as a high-stakes supply chain failure. Our Gemini-powered neural
              engine intercepts perishables and matches them to frontline impact zones in
              milliseconds.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                to="/auth"
                search={{ role: "donor" }}
                className="px-6 py-3 bg-foreground text-background font-heading font-medium hover:bg-bio-green transition-colors"
              >
                Inject supply →
              </Link>
              <Link
                to="/auth"
                search={{ role: "ngo" }}
                className="px-6 py-3 border border-soil-700 text-foreground font-heading font-medium hover:border-bio-green hover:text-bio-green transition-colors"
              >
                Receive supply
              </Link>
            </div>
          </div>

          {/* Telemetry block */}
          <div className="bg-card border border-soil-800 p-6 flex flex-col gap-6 relative telemetry-corners">
            <div className="flex justify-between items-center border-b border-soil-800 pb-2">
              <span className="font-data text-xs text-soil-600 tracking-widest">
                LIVE EXTRACTION YIELD
              </span>
              <span className="size-1.5 rounded-full bg-bio-green animate-pulse" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-data text-sm text-carbon">Mass rescued · 24h</span>
              <div className="font-data text-4xl md:text-5xl text-foreground tabular-nums tracking-tight">
                14,842.7 <span className="text-lg text-soil-600">KG</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-soil-800">
              <Stat label="Calories redirected" value="32.4M" />
              <Stat label="Methane mitigated" value="-8,204 CO₂e" />
              <Stat label="Active nodes" value="142" />
              <Stat label="Avg. routing latency" value="14ms" />
            </div>
          </div>
        </section>

        {/* TRIPARTITE */}
        <section className="flex flex-col gap-12">
          <div className="flex flex-col gap-3">
            <span className="font-data text-xs text-bio-cyan uppercase tracking-widest">
              [ Tripartite Resolution Engine ]
            </span>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground tracking-tight max-w-2xl">
              Three autonomous nodes. One continuous loop.
            </h2>
            <p className="text-sm max-w-[65ch] text-carbon">
              Donors, the Gemini core, and recipient NGOs work in synchronization to eliminate
              localized caloric deficit before perishability wins.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <NodeCard
              code="01"
              accent="bio-cyan"
              title="Supply injection"
              role="// Source"
              body="Restaurants and hubs signal excess in seconds. The terminal logs mass, dietary tags, and decay threshold."
            />
            <NodeCard
              code="02"
              accent="bio-green"
              title="Algorithmic synthesis"
              role="// Core"
              body="Gemini cross-references perishability, transit data, and NGO capacity to plot the optimal drop vector."
            />
            <NodeCard
              code="03"
              accent="bio-purple"
              title="Impact deployment"
              role="// Sink"
              body="Verified shelters receive autonomous dispatch alerts. Couriers route, mass is verified, the loop closes."
            />
          </div>
        </section>

        {/* IMPACT */}
        <section className="border border-soil-800 bg-card p-10 md:p-16 flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <span className="font-data text-xs text-bio-cyan uppercase tracking-widest">
              [ Aggregate Impact &middot; All Nodes ]
            </span>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground tracking-tight">
              Measured in kilograms. Felt in lives.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10 border-t border-soil-800 pt-10">
            <BigStat label="MASS RESCUED" value="84,291" unit="kg" />
            <BigStat label="MEALS SERVED" value="168,405" unit="" />
            <BigStat label="CO₂ AVOIDED" value="312.4" unit="t" />
          </div>
        </section>

        {/* CTA */}
        <section className="flex flex-col items-start gap-6 pb-12">
          <h3 className="font-heading text-2xl text-foreground max-w-xl">
            Join the network. Become a node.
          </h3>
          <Link
            to="/auth"
            className="px-6 py-3 bg-bio-green text-soil-950 font-heading font-medium hover:opacity-90 transition-opacity"
          >
            Initialize your node →
          </Link>
        </section>
      </main>

      <footer className="border-t border-soil-800 py-8 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-3 font-data text-xs text-soil-600">
          <span>TROPHIC.AI &middot; Surplus Food Rescue Protocol</span>
          <span>Powered by Google Gemini &middot; Built for Smart Supply Chains</span>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-data text-[10px] text-soil-600 uppercase">{label}</span>
      <span className="font-data text-lg text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function BigStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-data text-xs text-soil-600 uppercase tracking-widest">{label}</span>
      <div className="font-data text-5xl md:text-6xl text-foreground tabular-nums tracking-tight">
        {value}
        {unit && <span className="text-2xl text-soil-600 ml-2">{unit}</span>}
      </div>
    </div>
  );
}

function NodeCard({
  code,
  accent,
  title,
  role,
  body,
}: {
  code: string;
  accent: "bio-green" | "bio-cyan" | "bio-purple";
  title: string;
  role: string;
  body: string;
}) {
  const accentMap = {
    "bio-green": "text-bio-green border-bio-green/30 bg-bio-green/5",
    "bio-cyan": "text-bio-cyan border-bio-cyan/30 bg-bio-cyan/5",
    "bio-purple": "text-bio-purple border-bio-purple/30 bg-bio-purple/5",
  } as const;
  return (
    <div className="bg-card border border-soil-800 p-6 flex flex-col gap-4 hover:border-soil-700 transition-colors">
      <div
        className={`font-data text-[10px] tracking-widest border px-2 py-1 self-start uppercase ${accentMap[accent]}`}
      >
        Node {code} {role}
      </div>
      <h3 className="font-heading text-xl text-foreground font-medium mt-4">{title}</h3>
      <p className="text-sm text-carbon leading-relaxed">{body}</p>
    </div>
  );
}
