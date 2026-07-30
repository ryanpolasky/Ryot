import { describe, expect, it } from "vitest";
import {
  groupPremades,
  sharedGameCounts,
} from "../packages/shared/src/premades";

describe("sharedGameCounts", () => {
  it("counts shared recent match ids per unordered pair", () => {
    const edges = sharedGameCounts(["a", "b", "c"], {
      a: ["m1", "m2", "m3"],
      b: ["m2", "m3", "m4"],
      c: ["m9"],
    });
    expect(edges).toEqual([{ a: "a", b: "b", shared: 2 }]);
  });

  it("omits pairs with no overlap and players with no history", () => {
    expect(
      sharedGameCounts(["a", "b"], { a: ["m1"], b: ["m2"] }),
    ).toHaveLength(0);
    expect(sharedGameCounts(["a", "b"], {})).toHaveLength(0);
  });

  it("ignores duplicate match ids in a player's history", () => {
    const edges = sharedGameCounts(["a", "b"], {
      a: ["m1", "m1", "m1"],
      b: ["m1"],
    });
    expect(edges).toEqual([{ a: "a", b: "b", shared: 1 }]);
  });
});

describe("groupPremades", () => {
  it("drops links weaker than the threshold", () => {
    const edges = [{ a: "x", b: "y", shared: 1 }];
    expect(groupPremades(edges, 2)).toHaveLength(0);
    expect(groupPremades(edges, 1)).toHaveLength(1);
  });

  it("unions a transitive chain into one group", () => {
    // a-b and b-c both qualify, so all three queued together as a trio.
    const groups = groupPremades([
      { a: "a", b: "b", shared: 3 },
      { a: "b", b: "c", shared: 2 },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.puuids).toEqual(["a", "b", "c"]);
    expect(groups[0]!.sharedGames).toBe(3);
  });

  it("keeps unrelated duos as separate groups", () => {
    const groups = groupPremades([
      { a: "a", b: "b", shared: 4 },
      { a: "c", b: "d", shared: 2 },
    ]);
    expect(groups).toHaveLength(2);
    // Bigger/stronger groups sort first.
    expect(groups[0]!.puuids).toEqual(["a", "b"]);
  });

  it("sorts larger groups ahead of smaller ones", () => {
    const groups = groupPremades([
      { a: "d", b: "e", shared: 9 },
      { a: "a", b: "b", shared: 2 },
      { a: "b", b: "c", shared: 2 },
    ]);
    expect(groups.map((g) => g.puuids.length)).toEqual([3, 2]);
  });
});
