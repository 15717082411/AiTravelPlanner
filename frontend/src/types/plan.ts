export type PlanInput = {
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number;
  partySize: number;
  preferences?: string[];
};

export type PlanResponse = {
  destination: string;
  startDate: string;
  endDate: string;
  partySize: number;
  preferences: string[];
  itinerary: { day: number; title: string; activities: string[] }[];
  budget: { currency: string; estimate: number; breakdown: Record<string, number> };
};