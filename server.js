import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 8080);
const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");

app.use(express.json({ limit: "20kb" }));

let cachedAt = 0;
let cachedProspects = null;
const CACHE_MS = 30 * 60 * 1000;
const DISCOVERY_COOLDOWN_MS = 72 * 60 * 60 * 1000;
let lastDiscoveryAttemptAt = 0;
let lastSuccessfulDiscoveryAt = 0;
let discoveryInFlight = false;
const MIN_RETRY_INTERVAL_MS = 60 * 1000;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasDataConfigured: Boolean(process.env.HASDATA_API_KEY)
  });
});

app.post("/api/prospects/discover", async (req, res) => {
  const apiKey = process.env.HASDATA_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "HasData is not configured on the server. Add HASDATA_API_KEY in Railway Variables." });
  }

  const now = Date.now();
  if (cachedProspects && now - cachedAt < CACHE_MS) {
    return res.json({ prospects: cachedProspects, cached: true, source: "HasData Google Maps Search" });
  }

  if (discoveryInFlight) {
    return res.status(409).json({ error: "A live discovery search is already running. Please wait for it to finish." });
  }
  if (now - lastDiscoveryAttemptAt < MIN_RETRY_INTERVAL_MS) {
    return res.status(429).json({ error: "Please wait one minute before retrying discovery." });
  }
  if (lastSuccessfulDiscoveryAt && now - lastSuccessfulDiscoveryAt < DISCOVERY_COOLDOWN_MS) {
    const hoursRemaining = Math.ceil((DISCOVERY_COOLDOWN_MS - (now - lastSuccessfulDiscoveryAt)) / (60 * 60 * 1000));
    return res.status(429).json({ error: `A live search has already run recently. To protect HasData credits, try again in about ${hoursRemaining} hour(s). Cached results remain available for 30 minutes.` });
  }
  lastDiscoveryAttemptAt = now;
  discoveryInFlight = true;

  try {
    const params = new URLSearchParams({
      q: "HVAC contractors Phoenix Arizona",
      gl: "us",
      hl: "en"
    });
    const response = await fetch(`https://api.hasdata.com/scrape/google-maps/search?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("HasData request failed:", response.status, detail.slice(0, 500));
      return res.status(response.status === 401 || response.status === 403 ? 502 : 502).json({
        error: response.status === 401 || response.status === 403
          ? "HasData rejected the API key. Check the Railway variable and your HasData account."
          : `HasData returned an error (HTTP ${response.status}). Try again later.`
      });
    }

    const data = await response.json();
    const rows = Array.isArray(data.localResults) ? data.localResults
      : Array.isArray(data.places) ? data.places
      : Array.isArray(data.results) ? data.results
      : [];

    const cities = ["Phoenix", "Mesa", "Scottsdale", "Chandler", "Gilbert", "Glendale", "Tempe", "Peoria"];
    const prospects = rows.map((row, index) => {
      const name = row.title || row.name || row.businessName;
      if (!name) return null;
      const address = row.address || row.fullAddress || "";
      const city = cities.find((candidate) => address.toLowerCase().includes(candidate.toLowerCase())) || "Phoenix Metro";
      const websiteUrl = row.website || row.websiteUrl || "";
      const ratingValue = Number(row.rating);
      const reviewsValue = Number(row.reviews ?? row.reviewsCount ?? row.reviewCount);
      return {
        id: String(row.placeId || row.place_id || row.dataId || `hasdata-${now}-${index}`),
        name: String(name),
        city,
        state: "AZ",
        address,
        phone: row.phone || row.phoneNumber || "",
        websiteUrl,
        rating: Number.isFinite(ratingValue) && ratingValue > 0 ? ratingValue : undefined,
        reviews: Number.isFinite(reviewsValue) && reviewsValue >= 0 ? reviewsValue : undefined,
        website: websiteUrl ? "yes" : "unknown",
        ads: "unknown",
        lane: "Unknown",
        score: 0,
        issue: "Google Maps listing imported. Website and advertising evidence still need review.",
        offer: "Research website and advertising presence before recommending an offer",
        status: "Imported — needs audit",
        source: "HasData · Google Maps Search"
      };
    }).filter(Boolean);

    cachedProspects = prospects;
    cachedAt = Date.now();
    lastSuccessfulDiscoveryAt = Date.now();
    return res.json({
      prospects,
      cached: false,
      source: "HasData Google Maps Search",
      returned: prospects.length,
      note: "Google Maps data does not establish whether a business is advertising. Ad evidence remains Unknown."
    });
  } catch (error) {
    console.error("HasData discovery error:", error?.message || error);
    return res.status(502).json({ error: "Could not reach HasData. Check the connection and try again." });
  } finally {
    discoveryInFlight = false;
  }
});

app.use(express.static(dist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`AgencyOS server listening on port ${port}`);
});
