import type { FlightSearchParams, FlightOption } from "../../types/flight";

type FxRates = Record<string, number>;

async function getFxToSGD(env: Env, from: string): Promise<number> {
  if (from === "SGD") return 1;
  const key = `fx:SGD:${from}`;
  const cached = await env.CACHE.get(key);
  if (cached) return parseFloat(cached);
  const base = env.EXR_BASE ?? "https://api.frankfurter.app";
  const res = await fetch(`${base}/latest?from=${from}&to=SGD`);
  if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
  const data = (await res.json()) as { rates: FxRates };
  const rate = data.rates?.SGD;
  if (!rate) throw new Error("Missing SGD rate");
  await env.CACHE.put(key, String(rate), { expirationTtl: 60 * 60 * 24 });
  return rate;
}

function minutesFromKiwiDuration(totalSeconds: number | undefined): number {
  if (!totalSeconds || totalSeconds <= 0) return 0;
  return Math.round(totalSeconds / 60);
}

function inferBaggageIncluded(bagsPrice?: Record<string, number>): boolean {
  if (!bagsPrice) return false;
  const onePc = bagsPrice["1"];
  return typeof onePc === "number" && onePc === 0;
}

export async function searchKiwi(params: FlightSearchParams, env: Env): Promise<FlightOption[]> {
  const api = env.FLIGHT_API_BASE || "https://tequila-api.kiwi.com";
  const headers = { "apikey": env.FLIGHT_API_KEY } as Record<string, string>;
  const search = new URL(`${api}/v2/search`);
  search.searchParams.set("fly_from", params.origin);
  if (params.destination) search.searchParams.set("fly_to", params.destination);
  search.searchParams.set("date_from", params.dateFromISO);
  search.searchParams.set("date_to", params.dateToISO);
  search.searchParams.set("return_from", params.dateFromISO);
  search.searchParams.set("return_to", params.dateToISO);
  search.searchParams.set("curr", "SGD");
  search.searchParams.set("sort", "price");
  if (params.pax) search.searchParams.set("adults", String(params.pax));
  if (params.cabin) search.searchParams.set("selected_cabins", params.cabin);
  if (typeof params.maxStops === "number") search.searchParams.set("max_stopovers", String(params.maxStops));

  const res = await fetch(search.toString(), { headers });
  if (!res.ok) throw new Error(`Kiwi search failed: ${res.status}`);
  const data = await res.json() as any;
  const currency: string = data.currency || data.search_params?.curr || "SGD";
  const fx = await getFxToSGD(env, currency);

  const options: FlightOption[] = (data.data || []).slice(0, 20).map((d: any) => {
    const segments = Array.isArray(d.route) ? d.route : [];
    const stops = Math.max(0, segments.length - 1);
    const departISO = segments[0]?.local_departure ?? d.local_departure ?? d.utc_departure ?? "";
    const returnISO = segments[segments.length - 1]?.local_arrival ?? d.local_arrival ?? d.utc_arrival ?? "";
    const airline = (d.airlines && d.airlines[0]) || segments[0]?.airline || "";
    const durationMinutes = minutesFromKiwiDuration(d.duration?.total);
    const priceRaw: number = typeof d.price === "number" ? d.price : d.conversion?.[currency] || 0;
    const priceSGD = Math.round(priceRaw * fx);
    const bookingUrl: string = d.deep_link || "";
    const baggageIncluded = inferBaggageIncluded(d.bags_price);
    return {
      price: priceSGD,
      currency: "SGD",
      airline,
      durationMinutes,
      departISO,
      returnISO,
      stops,
      bookingUrl,
      baggageIncluded,
    };
  });

  return options;
}


