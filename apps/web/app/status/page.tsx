import type { Metadata } from "next";
import StatusDashboard from "@/components/StatusDashboard";

export const metadata: Metadata = {
  title: "Status",
  description:
    "Live health of Ryot's data sources: the Riot API, Data Dragon, and the u.gg build/tier data.",
};

export default function StatusPage() {
  return <StatusDashboard />;
}
