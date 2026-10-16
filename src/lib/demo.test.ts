import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptInvite,
  cancelSeat,
  changeRules,
  dateParts,
  DEMO_PLAYER,
  fullTables,
  initialGames,
  newSession,
  recordHand,
  respondToPoll,
  seats,
} from "./demo.ts";

test("demo fixtures are fresh and have explicit synthetic four-seat tables", () => {
  const games = initialGames();
  assert.equal(seats(games[1]), 7);
  assert.equal(fullTables(games[1]), 1);
  games[0].tables[0].players.push("Test player");
  assert.equal(initialGames()[0].tables[0].players.length, 2);
});
test("availability and maybe never allocate a seat", () => {
  const poll = initialGames()[2];
  for (const response of ["available", "maybe"] as const) {
    const result = respondToPoll(poll, response, poll.slots);
    assert.equal(result.response, response);
    assert.equal(seats(result), 0);
    assert.equal(result.selectedSlots.length, 3);
    assert.equal(poll.response, "pending");
  }
});
test("unavailable needs no slot or reason and clears previously chosen times", () => {
  const poll = initialGames()[2];
  assert.deepEqual(
    respondToPoll(poll, "unavailable", poll.slots).selectedSlots,
    [],
  );
});
test("availability validates times and de-duplicates flexible selections", () => {
  const poll = initialGames()[2];
  assert.throws(() => respondToPoll(poll, "available", []), /at least one/);
  assert.throws(
    () => respondToPoll(poll, "maybe", ["unknown"]),
    /from this poll/,
  );
  assert.equal(
    respondToPoll(poll, "available", [poll.slots[0], poll.slots[0]])
      .selectedSlots.length,
    1,
  );
});
test("confirming a poll is forbidden", () => {
  assert.throws(
    () => acceptInvite(initialGames(), "sunday"),
    /scheduled invitation/,
  );
});
test("seat acceptance is explicit, non-mutating and idempotent", () => {
  const games = initialGames();
  const accepted = acceptInvite(games, "monday");
  assert.equal(accepted[0].response, "accepted");
  assert.equal(seats(accepted[0]), 3);
  assert.equal(seats(games[0]), 2);
  assert.equal(acceptInvite(accepted, "monday"), accepted);
  assert.equal(
    accepted[0].tables[0].players.filter((name) => name === DEMO_PLAYER).length,
    1,
  );
});
test("full tables cannot be overbooked", () => {
  const games = initialGames();
  games[0].tables[0].players = ["One", "Two", "Three", "Four"];
  assert.throws(() => acceptInvite(games, "monday"), /Every seat is filled/);
});
test("a conflicting accepted game prevents an overlapping assignment", () => {
  const games = initialGames();
  games[0].startsAt = "2026-10-22T19:00";
  assert.throws(
    () => acceptInvite(games, "monday"),
    /already have a confirmed game/,
  );
  games[0].startsAt = "2026-10-22T15:00";
  assert.equal(acceptInvite(games, "monday")[0].response, "accepted");
});
test("cancellation releases the accepted seat and exposes an incomplete table", () => {
  const game = initialGames()[1];
  const cancelled = cancelSeat(game);
  assert.equal(seats(cancelled), 6);
  assert.equal(fullTables(cancelled), 0);
  assert.equal(cancelled.response, "unavailable");
  assert.ok(
    !cancelled.tables.some((table) => table.players.includes(DEMO_PLAYER)),
  );
  assert.equal(fullTables(game), 1);
});
test("a table needs four accepted players before a hand can be recorded", () => {
  const table = initialGames()[0].tables[0];
  assert.throws(
    () =>
      recordHand(table.sessions[0], table, {
        id: "hand",
        winner: "Jordan L.",
        points: 25,
      }),
    /four players/,
  );
});
test("manual scores validate participants, integer values and duplicate submissions", () => {
  const table = initialGames()[1].tables[0];
  const session = table.sessions[0];
  assert.throws(
    () =>
      recordHand(session, table, { id: "bad", winner: "Unknown", points: 25 }),
    /player at this table/,
  );
  for (const points of [-1, 1.5, NaN, 10001])
    assert.throws(
      () =>
        recordHand(session, table, { id: "bad", winner: DEMO_PLAYER, points }),
      /whole hand value/,
    );
  const hand = { id: "hand-1", winner: DEMO_PLAYER, points: 25 };
  const result = recordHand(session, table, hand);
  assert.equal(result.hands.length, 1);
  assert.equal(recordHand(result, table, hand), result);
  assert.equal(session.hands.length, 0);
});
test("draws record zero rather than a payout or a win", () => {
  const table = initialGames()[1].tables[0];
  const result = recordHand(table.sessions[0], table, {
    id: "draw",
    winner: "Draw",
    points: 100,
  });
  assert.deepEqual(result.hands[0], { id: "draw", winner: "Draw", points: 0 });
});
test("American rules can differ across tables without changing either table's history", () => {
  const tables = initialGames()[1].tables;
  const changed = changeRules(tables[1].sessions[0], {
    year: 2025,
    profile: "House rules",
  });
  assert.equal(changed.rules.year, 2025);
  assert.equal(changed.rules.profile, "House rules");
  assert.equal(tables[0].sessions[0].rules.year, 2026);
  assert.equal(tables[1].sessions[0].rules.year, 2026);
});
test("scored sessions lock rules; new sessions preserve prior scores and allow new rules", () => {
  const table = initialGames()[1].tables[0];
  const scored = recordHand(table.sessions[0], table, {
    id: "hand",
    winner: DEMO_PLAYER,
    points: 25,
  });
  assert.throws(
    () => changeRules(scored, { year: 2025 }),
    /Start a new session/,
  );
  const next = newSession({ ...table, sessions: [scored] }, "2");
  const changed = changeRules(next.sessions[1], {
    year: 2025,
    profile: "House rules",
  });
  assert.equal(changed.rules.year, 2025);
  assert.equal(next.sessions[0].rules.year, 2026);
  assert.equal(next.sessions[0].hands[0].points, 25);
  assert.deepEqual(next.sessions[1].hands, []);
  assert.throws(() => newSession(next, "2"), /already exists/);
});
test("displayed sample wall-clock time is independent of the viewer's time zone", () => {
  assert.deepEqual(dateParts("2026-10-19T13:00"), {
    short: "Oct 19",
    long: "Monday, October 19",
    time: "1:00 PM",
  });
});
