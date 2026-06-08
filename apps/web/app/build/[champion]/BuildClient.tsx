"use client";

import { useRouter, usePathname } from "next/navigation";

const RANKS = [
  { label: "Challenger", value: "challenger" },
  { label: "Grandmaster", value: "grandmaster" },
  { label: "Master+", value: "master_plus" },
  { label: "Diamond+", value: "diamond_plus" },
  { label: "Emerald+", value: "emerald_plus" },
  { label: "Platinum+", value: "platinum_plus" },
  { label: "Overall", value: "overall" },
];

const ROLE_VALUES: Record<string, string> = {
  Top: "top",
  Jungle: "jungle",
  Mid: "mid",
  Bottom: "bottom",
  Support: "support",
};

const RANK_VALUES: Record<string, string> = Object.fromEntries(
  RANKS.map((r) => [r.label, r.value]),
);

export default function BuildClient({
  champion,
  currentRole,
  currentRank,
  availableRoles,
}: {
  champion: string;
  currentRole: string;
  currentRank: string;
  availableRoles: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(role: string, rank: string) {
    const params = new URLSearchParams();
    if (role) params.set("role", ROLE_VALUES[role] ?? role.toLowerCase());
    if (rank) params.set("rank", RANK_VALUES[rank] ?? rank.toLowerCase());
    router.push(`${pathname}?${params}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Role buttons */}
      {availableRoles.map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => navigate(role, currentRank)}
          aria-pressed={role === currentRole}
          className={role === currentRole ? "seg seg-active" : "seg"}
        >
          {role}
        </button>
      ))}
      {/* Rank dropdown */}
      <select
        value={RANK_VALUES[currentRank] ?? "emerald_plus"}
        onChange={(e) => {
          const label = RANKS.find((r) => r.value === e.target.value)?.label ?? currentRank;
          navigate(currentRole, label);
        }}
        className="select w-full py-2 font-mono text-xs uppercase tracking-wider sm:ml-auto sm:w-auto"
        aria-label="Rank filter"
      >
        {RANKS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    </div>
  );
}
