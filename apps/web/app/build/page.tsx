import type { Metadata } from "next";
import BuildIndexClient from "./BuildIndexClient";

export const metadata: Metadata = {
  title: "Champion Builds",
  description:
    "Browse every League of Legends champion: best runes, items, skill order, and counters by role and rank, updated each patch.",
};

export default function BuildIndexPage() {
  return <BuildIndexClient />;
}
