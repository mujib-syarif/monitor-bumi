export type DemoEvent = {
  id: string;
  category: "Earthquake" | "Disaster" | "News";
  title: string;
  location: string;
  time: string;
  source: string;
  severity: "Low" | "Moderate" | "High";
};

export const demoEvents: DemoEvent[] = [
  { id: "demo-001", category: "Earthquake", title: "Sample seismic event", location: "Western Pacific", time: "DEMO · 12 min ago", source: "Illustrative data", severity: "Moderate" },
  { id: "demo-002", category: "Disaster", title: "Sample severe weather alert", location: "South Asia", time: "DEMO · 38 min ago", source: "Illustrative data", severity: "High" },
  { id: "demo-003", category: "News", title: "Sample international development", location: "Europe", time: "DEMO · 1 hr ago", source: "Illustrative data", severity: "Low" }
];
