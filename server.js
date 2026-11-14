import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 8080);
const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");

app.use(express.json({ limit: "20kb" }));

const CACHE_MS = 30 * 60 * 1000;
const DISCOVERY_COOLDOWN_MS = 72 * 60 * 60 * 1000;
const MIN_RETRY_INTERVAL_MS = 60 * 1000;

let cachedAt = 0;
let cachedProspects = null;
let lastDiscoveryAttemptAt = 0;
let lastSuccessfulDiscoveryAt = 0;
let discoveryInFlight = false;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasDataConfigured: Boolean(process.env.HASDATA_API_KEY) });
});

app.post("/api/prospects/discover", async (_req, res) => {
  const apiKey = process.env.HASDATA_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "HasData is not configured. Add HASDATA_API_KEY to Railway Variables."
    });
  }

  const now = Date.now();

  if (cachedProspects && now - cachedAt < CACHE_MS) {
    return res.json({
      prospects: cachedProspects,
      cached: true,
      source: "HasData Google Maps Search"
    });
  }

  if (discoveryInFlight) {
    return res.status(409).json({ error: "A discovery search is already running. Wait for it to finish." });
  }

  if (now - lastDiscoveryAttemptAt < MIN_RETRY_INTERVAL_MS) {
    return res.status(429).json({ error: "Please wait one minute before trying again." });
  }

  if (lastSuccessfulDiscoveryAt && now - lastSuccessfulDiscoveryAt < DISCOVERY_COOLDOWN_MS) {
    const hours = Math.ceil((DISCOVERY_COOLDOWN_MS - (now - lastSuccessfulDiscoveryAt)) / 3600000);
    return res.status(429).json({
      error: `A search already succeeded recently. Try again in about ${hours} hour(s).`
    });
  }

  lastDiscoveryAttemptAt = now;
  discoveryInFlight = true;

  try {
    const params = new URLSearchParams({
      q: "HVAC contractors Phoenix Arizona",
      gl: "us",
      hl: "en"
    });

    const response = await fetch(
      `https://api.hasdata.com/scrape/google-maps/search?${params}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        signal: AbortSignal.timeout(30000)
      }
    );

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }

    if (!response.ok) {
      const detail = typeof data === "string"
        ? data
        : data?.message || data?.error || JSON.stringify(data);
      const safeDetail = String(detail || "No error details returned").slice(0, 300);
      console.error(`HasData HTTP ${response.status}:`, safeDetail);

      return res.status(502).json({
        error: `HasData returned HTTP ${response.status}: ${safeDetail}`
      });
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      console.error("HasData returned an unexpected response format.");
      return res.status(502).json({
        error: "HasData responded, but the response was not valid JSON data."
      });
    }

    const rows = Array.isArray(data.localResults) ? data.localResults
      : Array.isArray(data.places) ? data.places
      : Array.isArray(data.results) ? data.results
      : null;

    if (!rows) {
      const fields = Object.keys(data).slice(0, 12).join(", ") || "none";
      console.error("HasData response missing results array. Fields:", fields);
      return res.status(502).json({
        error: `HasData response format changed. Expected localResults; received fields: ${fields}.`
      });
    }

    const cities = ["Phoenix", "Mesa", "Scottsdale", "Chandler", "Gilbert", "Glendale", "Tempe", "Peoria"];
    const prospects = rows.map((row, index) => {
      const name = row.title || row.name || row.businessName;
      if (!name) return null;

      const address = row.address || row.fullAddress || "";
      const city = cities.find((candidate) =>
        address.toLowerCase().includes(candidate.toLowerCase())
      ) || "Phoenix Metro";
      const websiteUrl = row.website || row.websiteUrl || "";
      const rating = Number(row.rating);
      const reviews = Number(row.reviews ?? row.reviewsCount ?? row.reviewCount);

      return {
        id: String(row.placeId || row.place_id || row.dataId || `hasdata-${now}-${index}`),
        name: String(name),
        city,
        state: "AZ",
        address,
        phone: row.phone || row.phoneNumber || "",
        websiteUrl,
        rating: Number.isFinite(rating) && rating > 0 ? rating : undefined,
        reviews: Number.isFinite(reviews) && reviews >= 0 ? reviews : undefined,
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
    const code = error?.cause?.code;
    const detail = code || error?.message || "Unknown connection error";
    const message = error?.name === "TimeoutError"
      ? "HasData did not respond within 30 seconds. No results were imported."
      : `Could not connect to HasData (${detail}). Check the Railway server connection and API key.`;

    console.error("HasData discovery error:", message);
    return res.status(502).json({ error: message });
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
