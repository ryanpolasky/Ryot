import type { Metadata } from "next";
import TierListClient from "./TierListClient";

export const metadata: Metadata = {
  title: "Tier List",
  description:
    "League of Legends champion tier lists for Summoner's Rift and ARAM, with win rates, pick rates, ranks, and direct links to champion builds.",
};

export default function TierListPage() {
  return <TierListClient />;
}
