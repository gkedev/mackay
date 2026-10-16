// Synthetic, in-memory prototype data. These helpers are not server authorization
// or concurrency controls. All sample wall-clock times use America/Los_Angeles.
export const DEMO_PLAYER = "Alex M.";
export const TIME_ZONE = "America/Los_Angeles";
export type Response =
  "pending" | "available" | "maybe" | "unavailable" | "accepted";
export type Rules = {
  variant: "American";
  year: number;
  profile: "Crew standard" | "House rules";
  notes: string;
  version: 1;
};
export type Hand = { id: string; winner: string; points: number };
export type Session = { id: string; rules: Rules; hands: Hand[] };
export type Table = { id: string; players: string[]; sessions: Session[] };
export type Game = {
  id: string;
  title: string;
  startsAt: string;
  duration: number;
  venue: string;
  kind: "invitation" | "poll";
  art: "ivory" | "graphite" | "silver";
  response: Response;
  selectedSlots: string[];
  slots: string[];
  tables: Table[];
  duties: { task: string; person: string }[];
};
export const standardRules: Rules = {
  variant: "American",
  year: 2026,
  profile: "Crew standard",
  notes: "Manual hand values. No automatic settlements.",
  version: 1,
};
const session = (id: string): Session => ({
  id,
  rules: { ...standardRules },
  hands: [],
});

export const crew = [
  {
    name: "Alex M.",
    initials: "AM",
    role: "You · demo organizer",
    tone: "stone",
  },
  { name: "Jordan L.", initials: "JL", role: "Organizer", tone: "sand" },
  { name: "Robin C.", initials: "RC", role: "Crew member", tone: "mist" },
  { name: "Casey W.", initials: "CW", role: "Crew member", tone: "rose" },
  { name: "Taylor S.", initials: "TS", role: "Crew member", tone: "stone" },
  { name: "Morgan B.", initials: "MB", role: "Crew member", tone: "sand" },
  { name: "Jamie P.", initials: "JP", role: "Crew member", tone: "mist" },
  { name: "Drew K.", initials: "DK", role: "Crew member", tone: "rose" },
];

export function initialGames(): Game[] {
  return [
    {
      id: "monday",
      title: "Monday, made for mahjong",
      startsAt: "2026-10-19T13:00",
      duration: 180,
      venue: "The Conservatory",
      kind: "invitation",
      art: "ivory",
      response: "pending",
      selectedSlots: [],
      slots: ["Mon, Oct 19 · 1:00 PM"],
      tables: [
        {
          id: "1",
          players: ["Jordan L.", "Robin C."],
          sessions: [session("1")],
        },
      ],
      duties: [
        { task: "Host", person: "Jordan L." },
        { task: "Tiles & racks", person: "Robin C." },
        { task: "Refreshments", person: "Open" },
      ],
    },
    {
      id: "evening",
      title: "An evening with the crew",
      startsAt: "2026-10-22T18:00",
      duration: 180,
      venue: "The Common Room",
      kind: "invitation",
      art: "graphite",
      response: "accepted",
      selectedSlots: [],
      slots: ["Thu, Oct 22 · 6:00 PM"],
      tables: [
        {
          id: "1",
          players: [DEMO_PLAYER, "Casey W.", "Taylor S.", "Morgan B."],
          sessions: [session("1")],
        },
        {
          id: "2",
          players: ["Jordan L.", "Jamie P.", "Drew K."],
          sessions: [session("1")],
        },
      ],
      duties: [
        { task: "Host", person: "Casey W." },
        { task: "Tiles & racks", person: "Morgan B." },
        { task: "Refreshments", person: "Taylor S." },
      ],
    },
    {
      id: "sunday",
      title: "Sunday slow play",
      startsAt: "2026-10-25T11:00",
      duration: 180,
      venue: "The Sunday Room",
      kind: "poll",
      art: "silver",
      response: "pending",
      selectedSlots: [],
      slots: [
        "Sun, Oct 25 · 11:00 AM",
        "Sun, Oct 25 · 2:00 PM",
        "Mon, Oct 26 · 1:00 PM",
      ],
      tables: [{ id: "1", players: [], sessions: [session("1")] }],
      duties: [
        { task: "Host", person: "Jamie P." },
        { task: "Tiles & racks", person: "Open" },
        { task: "Refreshments", person: "Open" },
      ],
    },
  ];
}

export function seats(game: Game) {
  return game.tables.reduce((n, table) => n + table.players.length, 0);
}
export function fullTables(game: Game) {
  return game.tables.filter((table) => table.players.length === 4).length;
}
export function dateParts(startsAt: string) {
  // Format a local wall-clock value without relying on the browser's time zone.
  const date = new Date(`${startsAt}:00Z`);
  return {
    short: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date),
    long: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(date),
  };
}
function overlaps(a: Game, b: Game) {
  if (a.startsAt.slice(0, 10) !== b.startsAt.slice(0, 10)) return false;
  const minutes = (value: string) =>
    Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));
  return (
    minutes(a.startsAt) < minutes(b.startsAt) + b.duration &&
    minutes(b.startsAt) < minutes(a.startsAt) + a.duration
  );
}
export function acceptInvite(games: Game[], id: string): Game[] {
  const game = games.find((game) => game.id === id);
  if (!game || game.kind !== "invitation")
    throw new Error("Only a scheduled invitation can be confirmed.");
  if (game.response === "accepted") return games;
  if (
    games.some(
      (other) =>
        other.id !== id &&
        other.response === "accepted" &&
        overlaps(game, other),
    )
  )
    throw new Error("You already have a confirmed game at this time.");
  const tableId = game.tables.find((table) => table.players.length < 4)?.id;
  if (!tableId)
    throw new Error(
      "Every seat is filled. Ask the organizer about the waitlist.",
    );
  return games.map((item) =>
    item.id !== id
      ? item
      : {
          ...item,
          response: "accepted",
          tables: item.tables.map((table) =>
            table.id !== tableId
              ? table
              : { ...table, players: [...table.players, DEMO_PLAYER] },
          ),
        },
  );
}
export function cancelSeat(game: Game): Game {
  return {
    ...game,
    response: "unavailable",
    tables: game.tables.map((table) => ({
      ...table,
      players: table.players.filter((player) => player !== DEMO_PLAYER),
    })),
  };
}
export function respondToPoll(
  game: Game,
  response: "available" | "maybe" | "unavailable",
  selectedSlots: string[],
): Game {
  if (game.kind !== "poll")
    throw new Error("This is not an availability poll.");
  if (response !== "unavailable" && selectedSlots.length === 0)
    throw new Error("Choose at least one time that could work for you.");
  if (selectedSlots.some((slot) => !game.slots.includes(slot)))
    throw new Error("Choose a time from this poll.");
  return {
    ...game,
    response,
    selectedSlots:
      response === "unavailable" ? [] : [...new Set(selectedSlots)],
  };
}
export function changeRules(
  session: Session,
  changes: Partial<Pick<Rules, "year" | "profile" | "notes">>,
): Session {
  if (session.hands.length)
    throw new Error(
      "This session has scores. Start a new session to use different rules.",
    );
  const rules = { ...session.rules, ...changes };
  if (!Number.isInteger(rules.year) || rules.year < 2020 || rules.year > 2100)
    throw new Error("Choose a valid card year.");
  return { ...session, rules };
}
export function recordHand(
  session: Session,
  table: Table,
  hand: Hand,
): Session {
  if (table.players.length !== 4)
    throw new Error(
      "Confirm four players at this table before recording a hand.",
    );
  if (session.hands.some((item) => item.id === hand.id)) return session;
  if (hand.winner !== "Draw" && !table.players.includes(hand.winner))
    throw new Error("Choose a player at this table.");
  if (!Number.isInteger(hand.points) || hand.points < 0 || hand.points > 10000)
    throw new Error("Enter a whole hand value from 0 to 10,000.");
  return {
    ...session,
    hands: [
      ...session.hands,
      { ...hand, points: hand.winner === "Draw" ? 0 : hand.points },
    ],
  };
}
export function newSession(table: Table, id: string): Table {
  if (table.sessions.some((session) => session.id === id))
    throw new Error("That session already exists.");
  const previous = table.sessions.at(-1)!;
  return {
    ...table,
    sessions: [
      ...table.sessions,
      { id, rules: { ...previous.rules }, hands: [] },
    ],
  };
}
