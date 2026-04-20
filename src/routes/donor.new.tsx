import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { scoreUrgency, type UrgencyResult } from "@/server/urgency.functions";
import { URGENCY_COLORS } from "@/lib/rescue-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/donor/new")({
  component: NewListingPage,
});

const FOOD_TAGS = ["veg", "non-veg", "vegan", "halal", "contains-dairy", "contains-nuts", "gluten-free"];

function NewListingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scoreFn = useServerFn(scoreUrgency);

  const [foodType, setFoodType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [hoursToExpiry, setHoursToExpiry] = useState("4");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [scoring, setScoring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<UrgencyResult | null>(null);

  const expiryISO = () => new Date(Date.now() + Number(hoursToExpiry) * 3600_000).toISOString();

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!foodType || !quantity) {
      toast.error("Add food type and quantity first.");
      return;
    }
    setScoring(true);
    try {
      const result = await scoreFn({
        data: {
          food_type: foodType,
          quantity_kg: Number(quantity),
          expiry_at: expiryISO(),
          dietary_tags: tags,
          pickup_address: address,
          description,
        },
      });
      setPreview(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI scoring failed");
    } finally {
      setScoring(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      // Score urgency if not already done
      let urgency = preview;
      if (!urgency) {
        urgency = await scoreFn({
          data: {
            food_type: foodType,
            quantity_kg: Number(quantity),
            expiry_at: expiryISO(),
            dietary_tags: tags,
            pickup_address: address,
            description,
          },
        });
      }
      const listingData = {
        donor_id: user.uid,
        food_type: foodType,
        quantity_kg: Number(quantity),
        expiry_at: expiryISO(),
        pickup_address: address,
        description,
        dietary_tags: tags,
        urgency_score: urgency.urgency_score,
        urgency_reason: urgency.reason,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      await addDoc(collection(db, "listings"), listingData);
      
      toast.success(`Payload injected. Urgency: ${urgency.urgency_label.toUpperCase()}`);
      navigate({ to: "/donor" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to list surplus");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      requiredRole="donor"
      title="Inject surplus"
      subtitle="Describe the payload. The Gemini core will score urgency and notify nearest NGOs."
      navItems={[
        { to: "/donor", label: "Overview" },
        { to: "/donor/new", label: "+ Inject Surplus" },
      ]}
    >
      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        <form onSubmit={handleSubmit} className="bg-card border border-soil-800 p-6 flex flex-col gap-5">
          <Field label="Food type" value={foodType} onChange={setFoodType} required placeholder="e.g. Vegetable biryani, sourdough loaves" />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Quantity (kg)"
              type="number"
              value={quantity}
              onChange={setQuantity}
              required
              min="0.1"
              step="0.1"
            />
            <Field
              label="Hours until expiry"
              type="number"
              value={hoursToExpiry}
              onChange={setHoursToExpiry}
              required
              min="0.5"
              step="0.5"
            />
          </div>
          <Field label="Pickup address" value={address} onChange={setAddress} required placeholder="Street, city" />

          <div>
            <span className="font-data text-[10px] uppercase tracking-widest text-soil-600 block mb-2">
              Dietary tags
            </span>
            <div className="flex flex-wrap gap-2">
              {FOOD_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={`px-3 py-1 font-data text-[11px] uppercase tracking-wider border transition-colors ${
                    tags.includes(t)
                      ? "border-bio-green text-bio-green bg-bio-green/5"
                      : "border-soil-700 text-soil-600 hover:border-soil-600"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-data text-[10px] uppercase tracking-widest text-soil-600">
              Notes (optional)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="bg-input border border-soil-700 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-bio-green transition-colors resize-none"
              placeholder="Any handling instructions, pickup window..."
            />
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={scoring}
              className="px-5 py-2.5 border border-bio-cyan text-bio-cyan font-data text-xs uppercase tracking-wider hover:bg-bio-cyan/10 transition-colors disabled:opacity-50"
            >
              {scoring ? "[ SCORING... ]" : "[ Preview Gemini score ]"}
            </button>
            <button
              type="submit"
              disabled={submitting || scoring}
              className="flex-1 px-5 py-2.5 bg-bio-green text-soil-950 font-heading font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Injecting..." : "Inject payload →"}
            </button>
          </div>
        </form>

        {/* AI preview pane */}
        <aside className="bg-card border border-soil-800 p-6 telemetry-corners h-fit sticky top-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-soil-800">
            <span className="font-data text-xs uppercase tracking-widest text-bio-cyan">
              [ GEMINI URGENCY PREVIEW ]
            </span>
            <span
              className={`size-1.5 rounded-full ${preview ? "bg-bio-green animate-pulse" : "bg-soil-700"}`}
            />
          </div>

          {!preview ? (
            <div className="text-center py-6">
              <p className="font-data text-xs text-soil-600 mb-3">[ AWAITING INPUT ]</p>
              <p className="text-sm text-muted-foreground">
                Fill the form and tap <em>Preview Gemini score</em> to see how urgent this rescue
                will be ranked for NGOs.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <span className="font-data text-[10px] uppercase tracking-widest text-soil-600">
                  Urgency score
                </span>
                <div className="font-data text-5xl text-foreground tabular-nums">
                  {preview.urgency_score}
                  <span className="text-lg text-soil-600">/100</span>
                </div>
                <span
                  className={`inline-block mt-2 font-data text-[10px] uppercase tracking-widest px-2 py-0.5 border ${URGENCY_COLORS[preview.urgency_label]}`}
                >
                  {preview.urgency_label}
                </span>
              </div>
              <div className="border-t border-soil-800 pt-4">
                <span className="font-data text-[10px] uppercase tracking-widest text-soil-600 block mb-1.5">
                  Reasoning
                </span>
                <p className="text-sm text-foreground leading-relaxed">{preview.reason}</p>
              </div>
              <div className="border-t border-soil-800 pt-4">
                <span className="font-data text-[10px] uppercase tracking-widest text-soil-600 block mb-1">
                  Suggested NGO radius
                </span>
                <span className="font-data text-2xl text-bio-cyan">
                  {preview.suggested_radius_km} km
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-data text-[10px] uppercase tracking-widest text-soil-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        min={min}
        step={step}
        className="bg-input border border-soil-700 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-bio-green transition-colors"
      />
    </label>
  );
}
