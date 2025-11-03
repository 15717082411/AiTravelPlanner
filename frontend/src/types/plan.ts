export type PlanInput = {
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number;
  partySize: number;
  preferences: string[];
  currency?: string;
};

export type PlanResponse = {
  destination: string;
  startDate: string;
  endDate: string;
  partySize: number;
  preferences: string[];
  currency: string;
  itinerary: Array<{
    date: string;
    activities: Array<{ time: string; name: string; type: string }>;
  }>;
  budget: {
    totalEstimate: number;
    transportation?: number;
    accommodation?: number;
    food?: number;
    attractions?: number;
  };
};