import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

const InputSchema = z.object({
  food_type: z.string().min(1).max(200),
  quantity_kg: z.number().positive().max(10000),
  expiry_at: z.string().min(1), // ISO
  dietary_tags: z.array(z.string().max(40)).max(10).optional().default([]),
  pickup_address: z.string().max(300).optional().default(""),
  description: z.string().max(500).optional().default(""),
});

export type UrgencyResult = {
  urgency_score: number; // 0-100
  urgency_label: "low" | "medium" | "high" | "critical";
  reason: string;
  suggested_radius_km: number;
};

const SYSTEM_PROMPT = `You are the Trophic.ai urgency engine for a food rescue platform.
Given a surplus food listing, score how urgent the rescue is on a 0-100 scale.
Consider: time-to-expiry (most important), quantity, perishability of the food type
(cooked meals, dairy, seafood = high; bread, produce = medium; canned/dry = low),
and dietary constraints that narrow recipient pool.

Score bands:
  0-30 low, 31-60 medium, 61-85 high, 86-100 critical.

Return ONLY via the score_urgency tool — no prose.`;

export const scoreUrgency = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<UrgencyResult> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const minutesToExpiry = Math.max(
      0,
      Math.round((new Date(data.expiry_at).getTime() - Date.now()) / 60000),
    );

    const userPrompt = `Listing:
- Food type: ${data.food_type}
- Quantity: ${data.quantity_kg} kg
- Minutes until expiry: ${minutesToExpiry}
- Dietary tags: ${data.dietary_tags.join(", ") || "none"}
- Pickup address: ${data.pickup_address || "n/a"}
- Notes: ${data.description || "none"}

Score the rescue urgency.`;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent({
        contents: [
          { role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] },
        ],
      });

      const response = result.response;
      const text = response.text();
      
      try {
        const parsed = JSON.parse(text);
        return {
          urgency_score: Math.max(0, Math.min(100, Math.round(parsed.urgency_score))),
          urgency_label: parsed.urgency_label,
          reason: String(parsed.reason).slice(0, 300),
          suggested_radius_km: Number(parsed.suggested_radius_km) || 5,
        };
      } catch (e) {
        console.error("Failed to parse Gemini response", text, e);
        return fallback(minutesToExpiry, data.food_type, "Parse error — heuristic score.");
      }
    } catch (error: any) {
      console.error("Gemini API error", error);
      if (error?.status === 429) {
        return fallback(minutesToExpiry, data.food_type, "Rate limit — using heuristic score.");
      }
      return fallback(minutesToExpiry, data.food_type, "AI unavailable — heuristic score.");
    }
  });

function fallback(minutes: number, foodType: string, reason: string): UrgencyResult {
  const perishable = /meal|dairy|milk|seafood|fish|meat|cooked|curry|rice/i.test(foodType);
  let score = 30;
  if (minutes < 60) score = 95;
  else if (minutes < 180) score = 80;
  else if (minutes < 360) score = 60;
  else if (minutes < 720) score = 45;
  if (perishable) score = Math.min(100, score + 10);
  const label =
    score >= 86 ? "critical" : score >= 61 ? "high" : score >= 31 ? "medium" : "low";
  return {
    urgency_score: score,
    urgency_label: label as UrgencyResult["urgency_label"],
    reason,
    suggested_radius_km: 5,
  };
}
