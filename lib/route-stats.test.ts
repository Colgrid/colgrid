import assert from "node:assert/strict";
import { test } from "node:test";
import { routeStats } from "./route-stats.ts";

test("route counts: completions, finished teams and invites", () => {
  const e = (kind: string, team_id: string | null = null, player_id: string | null = null) => ({ kind, team_id, player_id, quest_id: null });
  const s = Object.fromEntries(
    routeStats(
      [e("route_view"), e("route_view"), e("signup"), e("team_created", "t1"), e("route_start", "t1"), e("route_start", "t2"), e("invite_sent", "t1", "p1"), e("invite_sent", "t1", "p1"), e("invite_accepted", "t1", "p2")],
      [{ team_id: "t1", quest_id: "a" }, { team_id: "t1", quest_id: "b" }, { team_id: "t1", quest_id: "c" }, { team_id: "t2", quest_id: "a" }],
      [{ player_id: "p1", team_id: "t1" }, { player_id: "p2", team_id: "t1" }, { player_id: "p3", team_id: "t2" }],
      3,
    ),
  );
  assert.equal(s["Route page visits"], "2");
  assert.equal(s["Teams that started the route"], "2");
  assert.equal(s["Invites sent (taps on Invite friends)"], "2 by 1 player");
  assert.equal(s["Quest completions"], "4");
  assert.equal(s["Route completions (teams)"], "1");
  assert.equal(s["Players who played (finished a stop)"], "3");
});
