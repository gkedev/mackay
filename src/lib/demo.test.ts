import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptInvite,
  addScore,
  cancelSeat,
  changeRules,
  dateParts,
  demoId,
  DEMO_PLAYER,
  fullTables,
  initialGames,
  joinCode,
  newSession,
  openSpots,
  recordHand,
  respondToPoll,
  scoreStats,
  seats,
  tablesFor,
} from "./demo.ts";

test("demo IDs use random values without depending on HTTPS-only randomUUID", () => {
  const original = globalThis.crypto;
  try {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { getRandomValues: (values: Uint32Array) => values.fill(1) },
    });
    assert.equal(demoId(), "demo-00000001000000010000000100000001");
  } finally {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: original,
    });
  }
});

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

test("max attendees caps seats; blank means unlimited and opens new tables", () => {
  const games = initialGames();
  assert.equal(openSpots(games[0]), 2);
  assert.equal(openSpots(games[2]), null);
  assert.equal(tablesFor(null), 1);
  assert.equal(tablesFor(9), 3);
  const full = { ...games[0], id: "full", maxAttendees: 2 };
  assert.throws(() => acceptInvite([full], "full"), /Every seat is filled/);
  const packed = {
    ...games[0],
    id: "packed",
    maxAttendees: null,
    tables: [{ ...games[0].tables[0], players: ["A", "B", "C", "D"] }],
  };
  const [result] = acceptInvite([packed], "packed");
  assert.equal(result.tables.length, 2);
  assert.deepEqual(result.tables[1].players, [DEMO_PLAYER]);
});
test("join codes are six unambiguous characters", () => {
  assert.match(joinCode(), /^[A-HJ-NP-Z2-9]{6}$/);
});
test("scores: stats per mahjong type, validation, de-duplication", () => {
  const a = {
    id: "a",
    title: "Fri",
    date: "2026-10-20",
    type: "American" as const,
    won: true,
    points: 50,
  };
  const b = {
    id: "b",
    title: "Sat",
    date: "2026-10-21",
    type: "Chinese" as const,
    won: false,
    points: 25,
  };
  assert.deepEqual(scoreStats([], "All"), {
    list: [],
    games: 0,
    wins: 0,
    avg: 0,
  });
  const entries = addScore(addScore([], a), b);
  assert.equal(entries[0].id, "b");
  assert.equal(addScore(entries, a), entries);
  assert.deepEqual(
    { ...scoreStats(entries, "All"), list: 0 },
    { list: 0, games: 2, wins: 1, avg: 38 },
  );
  assert.equal(scoreStats(entries, "Chinese").wins, 0);
  assert.throws(
    () => addScore([], { ...a, id: "c", points: -1 }),
    /whole points/,
  );
  assert.throws(() => addScore([], { ...a, id: "c", title: " " }), /game name/);
});
