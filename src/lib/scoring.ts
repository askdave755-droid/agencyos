export type WebsiteEvidence = "present" | "absent" | "unknown";
export type AdEvidence = "active" | "problem" | "none_found" | "unknown";
export type ProspectLane = "A" | "B" | "C" | "D" | "Unknown";

/**
 * Deterministic sales routing. Never infer "no ads" from a failed search.
 * Lane C requires an affirmative, documented ad-library/search review.
 */
export function classifyProspect(website: WebsiteEvidence, ads: AdEvidence): ProspectLane {
  if (website === "absent") return "A";
  if (website === "unknown" || ads === "unknown") return "Unknown";
  if (ads === "problem") return "B";
  if (website === "present" && ads === "none_found") return "C";
  if (website === "present" && ads === "active") return "D";
  return "Unknown";
}

export const laneOffers: Record<ProspectLane, string> = {
  A: "Build the website first",
  B: "Fix the identified advertising problem",
  C: "Advertising and lead generation",
  D: "Skip or nurture; do not force a sale",
  Unknown: "Gather more evidence before recommending an offer"
};
