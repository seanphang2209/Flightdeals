export type FlightSearchParams = {
  origin: string;           // e.g., "SIN"
  destination?: string;     // optional for multi-dest scoring
  dateFromISO: string;      // outbound date (YYYY-MM-DD)
  dateToISO: string;        // return date (YYYY-MM-DD)
  pax?: number;
  cabin?: "M" | "W" | "C" | "F";
  maxStops?: number;
};

export type FlightOption = {
  price: number;            // in SGD
  currency: "SGD";
  airline: string;
  durationMinutes: number;
  departISO: string;
  returnISO: string;
  stops: number;
  bookingUrl: string;
  baggageIncluded: boolean;
};
