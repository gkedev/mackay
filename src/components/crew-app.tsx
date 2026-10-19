"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import logoImage from "@/assets/rackettes-logo.png";
import {
  acceptInvite,
  addScore,
  cancelSeat,
  changeRules,
  crew,
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
  standardRules,
  tablesFor,
  TIME_ZONE,
  type Game,
  type MahjongType,
  type ScoreEntry,
  type Visibility,
  type Session,
  type Table,
} from "@/lib/demo";

type IconName =
  | "plus"
  | "arrow"
  | "chevron"
  | "pin"
  | "calendar"
  | "clock"
  | "people"
  | "close"
  | "check"
  | "sparkle"
  | "copy"
  | "grid"
  | "globe"
  | "lock"
  | "refresh"
  | "trophy"
  | "star"
  | "trend"
  | "bell";
function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4m10-4v4M3 11h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    sparkle: (
      <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z" />
    ),
    copy: (
      <>
        <rect x="8" y="8" width="13" height="13" rx="2" />
        <path d="M16 8V3H3v13h5" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5M4 4v4.5h4.5" />
        <path d="M4 13a8 8 0 0 0 14.3 4.3l1.7-1.8m0 4.5v-4.5h-4.5" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 4m8-4h3a3 3 0 0 1-3 4" />
        <path d="M12 13v4m-4 3h8m-6 0 .5-3h3l.5 3" />
      </>
    ),
    star: (
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z" />
    ),
    trend: <path d="m3 17 6-6 4 4 8-8m-5 0h5v5" />,
    bell: (
      <>
        <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4Z" />
        <path d="M10 21h4" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
function Logo() {
  return (
    <span className="brand">
      <img className="brand-logo" src={logoImage.src} alt="Rackettes" />
      <span className="brand-tag">MAHJONG</span>
    </span>
  );
}
function TileArtwork({
  variant = "ivory",
  hero = false,
}: {
  variant?: Game["art"];
  hero?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const dark = variant === "graphite";
  const tile = (
    transform: string,
    symbol: "dots" | "wind" | "bamboo",
    tone: string,
  ) => (
    <g transform={transform}>
      <rect
        x="0"
        y="8"
        width="100"
        height="138"
        rx="13"
        fill={dark ? "#2a2a2a" : "#b4b4b4"}
      />
      <rect
        width="100"
        height="138"
        rx="13"
        fill={tone}
        stroke={dark ? "#ff13bc" : "#fff"}
        strokeWidth="1.5"
      />
      <rect
        x="6"
        y="6"
        width="88"
        height="126"
        rx="9"
        fill="none"
        stroke="#777"
        strokeOpacity=".14"
      />
      {symbol === "wind" ? (
        <g
          stroke="#ff13bc"
          strokeWidth="5.5"
          fill="none"
          strokeLinejoin="round"
        >
          <path d="M50 30v80M28 48h44v36H28z" />
        </g>
      ) : symbol === "dots" ? (
        <g fill="none" stroke="#1a1a1a" strokeWidth="3.5">
          {[
            [31, 38],
            [69, 38],
            [50, 69],
            [31, 100],
            [69, 100],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r="9" />
              <circle cx={x} cy={y} r="2" fill="#1a1a1a" />
            </g>
          ))}
        </g>
      ) : (
        <g stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round">
          {[33, 65].map((x) => (
            <g key={x}>
              <path d={`M${x} 32v74`} />
              <path
                d={`m${x - 7} 47 7-5 7 5m-14 24 7-5 7 5m-14 24 7-5 7 5`}
                strokeWidth="3"
              />
            </g>
          ))}
        </g>
      )}
    </g>
  );
  return (
    <svg
      className={`tile-art ${hero ? "hero-art" : ""}`}
      viewBox="0 0 500 330"
      preserveAspectRatio={hero ? "xMidYMid meet" : "xMidYMid slice"}
      role="img"
      aria-label="Sculptural silver and ivory mahjong tiles"
    >
      <defs>
        <radialGradient id={`${id}-bg`} cx="55%" cy="35%" r="80%">
          <stop
            stopColor={
              dark ? "#2b2b2b" : variant === "silver" ? "#e4e4e4" : "#f2f2f2"
            }
          />
          <stop
            offset="1"
            stopColor={
              dark ? "#050505" : variant === "silver" ? "#bababa" : "#d6d6d6"
            }
          />
        </radialGradient>
        <filter
          id={`${id}-shadow`}
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
        >
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      {!hero && <rect width="500" height="330" fill={`url(#${id}-bg)`} />}
      <ellipse
        cx="270"
        cy="264"
        rx="150"
        ry="25"
        fill="#0a0a0a"
        opacity={hero ? ".15" : ".22"}
        filter={`url(#${id}-shadow)`}
      />
      <g transform={hero ? "translate(10 -6)" : "translate(0 0)"}>
        {tile(
          "translate(114 100) rotate(-23 50 69)",
          "bamboo",
          dark ? "#d4d4d4" : "#e2e2e2",
        )}
        {tile("translate(283 87) rotate(20 50 69)", "dots", "#f2f2f2")}
        {tile("translate(206 58) rotate(-5 50 69)", "wind", "#fafafa")}
      </g>
      {!hero && (
        <>
          <text
            x="28"
            y="35"
            fill={dark ? "#ff13bc" : "#141414"}
            fontSize="11"
            fontFamily="Arial, sans-serif"
            letterSpacing="3"
          >
            RACKETTES
          </text>
          <path
            d="M456 27v16m-8-8h16"
            stroke={dark ? "#ff13bc" : "#141414"}
            strokeWidth="1"
          />
        </>
      )}
      {hero && (
        <>
          <circle cx="112" cy="60" r="4" fill="#ff13bc" />
          <path
            d="M402 221v16m-8-8h16M100 223v10m-5-5h10"
            stroke="#141414"
            strokeWidth="1.3"
          />
        </>
      )}
    </svg>
  );
}
function Avatar({
  name,
  size = "normal",
}: {
  name: string;
  size?: "normal" | "small";
}) {
  const person = crew.find((person) => person.name === name);
  return (
    <span
      className={`avatar ${person?.tone ?? "mist"} ${size === "small" ? "avatar-small" : ""}`}
      title={name}
    >
      {person?.initials ??
        name
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)}
    </span>
  );
}
function Dialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
function GameCard({ game, onOpen }: { game: Game; onOpen: () => void }) {
  const date = dateParts(game.startsAt);
  const status =
    game.response === "accepted"
      ? "You're confirmed"
      : game.kind === "poll"
        ? game.response === "pending"
          ? "Finding a time"
          : "Response sent"
        : openSpots(game) === null
          ? "Open to all"
          : `${openSpots(game)} spots open`;
  return (
    <button
      type="button"
      className="game-card"
      onClick={onOpen}
      aria-label={`View ${game.title}`}
    >
      <div className={`card-art ${game.art}`}>
        <TileArtwork variant={game.art} />
        <span className="art-label">
          {game.kind === "poll" ? "AVAILABILITY POLL" : "AMERICAN MAHJONG"}
        </span>
        <span className="card-arrow">
          <Icon name="arrow" />
        </span>
      </div>
      <div className="card-body">
        <p className="card-date">
          {date.short} <span>·</span>{" "}
          {game.kind === "poll"
            ? `${game.slots.length} possible times`
            : date.time}
        </p>
        <h3>{game.title}</h3>
        <p className="card-venue">
          <Icon name="pin" size={15} />
          {game.venue}
        </p>
        <div className="card-bottom">
          <div className="avatar-stack">
            {(game.kind === "poll"
              ? ["Jamie P.", "Robin C.", "Taylor S."]
              : game.tables.flatMap((table) => table.players)
            )
              .slice(0, 3)
              .map((name) => (
                <Avatar key={name} name={name} size="small" />
              ))}
            <span className="table-count">
              {game.tables.length}{" "}
              {game.tables.length === 1 ? "table" : "tables"}
            </span>
          </div>
          <span
            className={`card-status ${game.response === "accepted" ? "status-confirmed" : ""}`}
          >
            {game.response === "accepted" && <Icon name="check" size={13} />}
            {status}
          </span>
        </div>
      </div>
    </button>
  );
}

function ScoresView({
  scores,
  onAdd,
  onBell,
}: {
  scores: ScoreEntry[];
  onAdd: () => void;
  onBell: () => void;
}) {
  const [type, setType] = useState<MahjongType | "All">("All");
  const stats = scoreStats(scores, type);
  return (
    <section className="scores-page">
      <div className="scores-head">
        <div>
          <h1 className="page-title">Scores</h1>
          <p className="section-description">Track your mahjong performance</p>
        </div>
        <div className="scores-actions">
          <button type="button" className="button button-dark" onClick={onAdd}>
            <Icon name="plus" size={16} />
            Score
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Notifications"
            onClick={onBell}
          >
            <Icon name="bell" size={18} />
          </button>
        </div>
      </div>
      <div className="stat-cards">
        {(
          [
            ["trophy", stats.games, "Games"],
            ["star", stats.wins, "Wins"],
            ["trend", stats.avg, "Avg Pts"],
          ] as const
        ).map(([icon, value, label]) => (
          <div className="stat-card" key={label}>
            <Icon name={icon} size={20} />
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="segmented" aria-label="Filter by mahjong type">
        {(["All", "American", "Chinese"] as const).map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={type === item}
            onClick={() => setType(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {stats.list.length === 0 ? (
        <div className="scores-empty">
          <span className="scores-empty-icon">
            <Icon name="trophy" size={34} />
          </span>
          <h3>No scores yet</h3>
          <p>Record your first game score</p>
        </div>
      ) : (
        <ul className="score-list">
          {stats.list.map((entry) => (
            <li key={entry.id}>
              <div>
                <strong>{entry.title}</strong>
                <span>
                  {dateParts(`${entry.date}T12:00`).short} · {entry.type}
                </span>
              </div>
              {entry.won && <span className="pill">Win</span>}
              <span className="score-points">
                {entry.points}
                <small> pts</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
function AddScore({
  games,
  onClose,
  onAdd,
}: {
  games: Game[];
  onClose: () => void;
  onAdd: (entry: ScoreEntry) => void;
}) {
  const [error, setError] = useState("");
  const [game, setGame] = useState("");
  const picked = games.find((item) => item.id === game);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const points = String(data.get("points")).trim();
      onAdd({
        id: demoId(),
        title: String(data.get("title") ?? picked?.title ?? ""),
        date: String(data.get("date")),
        type: data.get("type") as MahjongType,
        won: data.get("won") === "on",
        points: points === "" ? NaN : Number(points),
      });
    } catch (error) {
      setError((error as Error).message);
    }
  }
  return (
    <Dialog title="Record a score" onClose={onClose}>
      <p className="modal-intro">Your own result for one game.</p>
      <form className="create-form" onSubmit={submit} key={game}>
        <label className="field">
          Game
          <select
            value={game}
            onChange={(event) => setGame(event.target.value)}
          >
            <option value="">Another game…</option>
            {games.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        {picked ? (
          <input type="hidden" name="title" value={picked.title} />
        ) : (
          <label className="field">
            Game name
            <input
              name="title"
              placeholder="e.g. Friday Night Mahjong"
              required
              maxLength={70}
            />
          </label>
        )}
        <div className="form-two">
          <label className="field">
            Date
            <input
              name="date"
              type="date"
              defaultValue={picked?.startsAt.slice(0, 10) ?? "2026-10-19"}
              required
            />
          </label>
          <label className="field">
            Mahjong Type
            <select
              name="type"
              defaultValue={
                picked?.tables[0].sessions.at(-1)?.rules.variant ?? "American"
              }
            >
              <option value="American">American</option>
              <option value="Chinese">Chinese</option>
            </select>
          </label>
        </div>
        <label className="field">
          Points
          <input
            name="points"
            type="number"
            inputMode="numeric"
            min={0}
            max={10000}
            step={1}
            placeholder="e.g. 50"
            required
          />
        </label>
        <label className="check-row">
          <input type="checkbox" name="won" />I won this game
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button-dark full-width">
          Save score
          <Icon name="arrow" size={16} />
        </button>
        <p className="demo-note">
          Saved only in this browser tab until you refresh.
        </p>
      </form>
    </Dialog>
  );
}

const NAV = [
  ["Discover", "grid"],
  ["My games", "calendar"],
  ["Scores", "trophy"],
  ["Crew", "people"],
] as const;
export function CrewApp() {
  const [games, setGames] = useState(initialGames);
  const [view, setView] = useState<(typeof NAV)[number][0]>("Discover");
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [filter, setFilter] = useState("All games");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<
    "create" | "how" | "profile" | "invite" | "score" | null
  >(null);
  const [notice, setNotice] = useState("");
  const selected = games.find((game) => game.id === selectedId);
  const visible = games.filter(
    (game) =>
      (view !== "My games" ||
        ["accepted", "available", "maybe"].includes(game.response)) &&
      (filter === "All games" ||
        (filter === "Needs a reply" && game.response === "pending") ||
        (filter === "Confirmed" && game.response === "accepted")),
  );
  function updateGame(game: Game) {
    setGames((current) =>
      current.map((item) => (item.id === game.id ? game : item)),
    );
  }
  function confirm(id: string) {
    setGames(acceptInvite(games, id));
  }
  function navigate(nextView: typeof view) {
    setView(nextView);
    setFilter("All games");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function reset() {
    setGames(initialGames());
    setScores([]);
    navigate("Discover");
    setNotice("Demo reset. All changes were only in this browser tab.");
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            type="button"
            className="brand-button"
            aria-label="Rackettes Mahjong home"
            onClick={() => navigate("Discover")}
          >
            <Logo />
          </button>
          <nav className="main-nav" aria-label="Main navigation">
            {NAV.map(([item, icon]) => (
              <button
                type="button"
                key={item}
                aria-current={view === item ? "page" : undefined}
                onClick={() => navigate(item)}
              >
                <Icon name={icon} size={18} />
                <span>{item}</span>
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <button
              type="button"
              className="button button-dark create-button"
              onClick={() => setModal("create")}
            >
              <Icon name="plus" size={16} />
              <span>Create game</span>
            </button>
            <button
              type="button"
              className="profile-button"
              aria-label="Open demo profile"
              onClick={() => setModal("profile")}
            >
              <Avatar name={DEMO_PLAYER} />
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="site-main" tabIndex={-1}>
        {view === "Discover" && (
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="live-dot" />
                THE GOOD COMPANY CLUB
              </p>
              <h1>
                Good company.
                <br />
                <span>Great hands.</span>
              </h1>
              <p className="hero-description">
                A little competition. A lot of connection.
                <br />
                Your next seat at the table starts here.
              </p>
              <div className="hero-actions">
                <button
                  type="button"
                  className="button button-dark"
                  onClick={() =>
                    document
                      .getElementById("games")
                      ?.scrollIntoView({ block: "start" })
                  }
                >
                  Find a game
                  <Icon name="arrow" size={17} />
                </button>
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setModal("how")}
                >
                  How it works
                  <Icon name="chevron" size={14} />
                </button>
              </div>
              <div className="hero-social">
                <div className="avatar-stack">
                  {["Jordan L.", "Robin C.", "Casey W.", "Taylor S."].map(
                    (name) => (
                      <Avatar key={name} name={name} size="small" />
                    ),
                  )}
                </div>
                <span>Familiar faces. A few new friends.</span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <TileArtwork hero />
              <div className="floating-note">
                <span className="note-icon">
                  <Icon name="sparkle" size={17} />
                </span>
                <div>
                  Better together.
                  <small>Four seats. Endless possibilities.</small>
                </div>
              </div>
              <span className="hero-art-caption">
                THE ART OF GETTING TOGETHER
              </span>
            </div>
          </section>
        )}
        {view === "Scores" ? (
          <ScoresView
            scores={scores}
            onAdd={() => setModal("score")}
            onBell={() =>
              setNotice("No notifications yet. This preview never sends any.")
            }
          />
        ) : view === "Crew" ? (
          <section className="crew-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">YOUR INNER CIRCLE</p>
                <h1 className="page-title">The crew.</h1>
                <p className="section-description">
                  Good games start with good people.
                </p>
              </div>
              <button
                type="button"
                className="button button-dark"
                onClick={() => setModal("invite")}
              >
                <Icon name="plus" size={16} />
                Invite a friend
              </button>
            </div>
            <div className="crew-banner">
              <span className="crew-banner-icon">
                <Icon name="people" size={28} />
              </span>
              <div>
                <h3>A small crew. A standing invitation.</h3>
                <p>
                  {crew.length} fictional members · Private crew preview ·
                  American Mahjong
                </p>
              </div>
              <span className="pill">Design preview</span>
            </div>
            <div className="crew-grid">
              {crew.map((person) => (
                <article className="person-card" key={person.name}>
                  <Avatar name={person.name} />
                  <div>
                    <h3>{person.name}</h3>
                    <p>{person.role}</p>
                  </div>
                  <span className="member-label">Demo member</span>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section
            id="games"
            className={`games-section ${view === "My games" ? "my-games-section" : ""}`}
          >
            <div className="section-heading">
              <div>
                {view === "My games" && (
                  <p className="eyebrow welcome-line">
                    Welcome back, {DEMO_PLAYER.split(" ")[0]}
                  </p>
                )}
                <h2 className={view === "My games" ? "page-title" : ""}>
                  {view === "My games" ? "Upcoming Games" : "On the calendar"}
                </h2>
                <p className="section-description">
                  {view === "My games"
                    ? "Your confirmed seats and availability responses, all together."
                    : "A good hand is even better with your people."}
                </p>
              </div>
              <span className="timezone">
                <Icon name="clock" size={15} />
                Pacific time
              </span>
            </div>
            <div className="filters-row">
              <div className="filters" aria-label="Filter games">
                {["All games", "Needs a reply", "Confirmed"].map((item) => (
                  <button
                    type="button"
                    key={item}
                    aria-pressed={filter === item}
                    className={filter === item ? "active" : ""}
                    onClick={() => setFilter(item)}
                  >
                    {item}
                    {item === "Needs a reply" && (
                      <span>
                        {
                          games.filter((game) => game.response === "pending")
                            .length
                        }
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <span className="preview-label">
                <span />
                SYNTHETIC GAMES
              </span>
            </div>
            <div className="game-grid">
              {visible.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onOpen={() => setSelectedId(game.id)}
                />
              ))}
            </div>
            {visible.length === 0 && (
              <div className="empty-state">
                <Icon name="calendar" size={32} />
                <h3>A little space in your calendar.</h3>
                <p>
                  {view === "My games"
                    ? "Respond to a game in Discover to see it here."
                    : "No games match this filter. Try another view."}
                </p>
                <button
                  type="button"
                  className="button button-light"
                  onClick={() => {
                    setView("Discover");
                    setFilter("All games");
                  }}
                >
                  Explore games
                  <Icon name="arrow" />
                </button>
              </div>
            )}
            <div className="host-banner">
              <div className="host-symbol">
                <Icon name="grid" size={24} />
              </div>
              <div>
                <h3>Your table. Your kind of afternoon.</h3>
                <p>
                  Bring your favorite people together. We&apos;ll keep the
                  details simple.
                </p>
              </div>
              <button
                type="button"
                className="button button-light"
                onClick={() => setModal("create")}
              >
                Host a game
                <Icon name="arrow" size={16} />
              </button>
            </div>
          </section>
        )}
        <div className="demo-disclosure">
          <Icon name="sparkle" size={15} />
          <p>
            <strong>A first look, not a live club.</strong> All players, venues,
            and games are fictional. Changes last only until you refresh.
          </p>
        </div>
      </main>
      <footer className="site-footer">
        <Logo />
        <p>Made for the people around your table.</p>
        <button type="button" onClick={reset}>
          Reset demo
          <Icon name="arrow" size={14} />
        </button>
      </footer>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setNotice("")}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      {selected && (
        <GameDetails
          key={selected.id}
          game={selected}
          onClose={() => setSelectedId(null)}
          onUpdate={updateGame}
          onConfirm={() => confirm(selected.id)}
        />
      )}
      {modal === "score" && (
        <AddScore
          games={games.filter((game) => game.kind === "invitation")}
          onClose={() => setModal(null)}
          onAdd={(entry) => {
            setScores(addScore(scores, entry)); // throws to the form on bad input
            setModal(null);
            setNotice("Score saved in this tab.");
          }}
        />
      )}
      {modal === "create" && (
        <CreateGame
          onClose={() => setModal(null)}
          onCreate={(game) => {
            setGames((current) =>
              [...current, game].sort((a, b) =>
                a.startsAt.localeCompare(b.startsAt),
              ),
            );
            setModal(null);
            setView("Discover");
            setFilter("All games");
            setSelectedId(game.id);
          }}
        />
      )}
      {modal === "how" && (
        <Dialog
          title="More play. Less planning."
          onClose={() => setModal(null)}
        >
          <p className="modal-intro">
            A simple way to get your people around a table.
          </p>
          <ol className="how-steps">
            <li>
              <span>01</span>
              <div>
                <h3>Find your afternoon.</h3>
                <p>Browse games or tell the crew which times work for you.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Make it a four.</h3>
                <p>
                  Accept an invitation to confirm your seat. Availability alone
                  isn&apos;t a booking.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Bring your good company.</h3>
                <p>
                  See your table, share the duties, and record hands after you
                  play.
                </p>
              </div>
            </li>
          </ol>
          <p className="demo-note">
            This prototype uses only fictional data. No invites or messages are
            sent.
          </p>
        </Dialog>
      )}
      {modal === "profile" && (
        <Dialog title="Your demo profile" onClose={() => setModal(null)}>
          <div className="profile-summary">
            <Avatar name={DEMO_PLAYER} />
            <div>
              <h3>{DEMO_PLAYER}</h3>
              <p>Fictional player · Organizer preview</p>
            </div>
          </div>
          <p className="modal-intro">
            You&apos;re trying the app as Alex. No sign-in, account, or
            permissions system is connected yet.
          </p>
          <div className="info-box">
            <strong>American Mahjong</strong>
            <span>
              Rules are selected for each game session, not locked across the
              whole crew.
            </span>
          </div>
          <button
            type="button"
            className="button button-light full-width"
            onClick={() => {
              reset();
              setModal(null);
            }}
          >
            Reset all demo changes
          </button>
        </Dialog>
      )}
      {modal === "invite" && (
        <Dialog
          title="Good company starts with an invite."
          onClose={() => setModal(null)}
        >
          <p className="modal-intro">
            In the live app, you&apos;ll share a private invitation link. Your
            friend will preview the crew and explicitly accept after signing in.
          </p>
          <div className="info-box">
            <strong>Invitations aren&apos;t connected yet.</strong>
            <span>
              This design preview won&apos;t create a live link, send a message,
              or add a real person.
            </span>
          </div>
          <button
            type="button"
            className="button button-dark full-width"
            onClick={() => setModal(null)}
          >
            Back to the crew
            <Icon name="arrow" />
          </button>
        </Dialog>
      )}
    </>
  );
}

function GameDetails({
  game,
  onClose,
  onUpdate,
  onConfirm,
}: {
  game: Game;
  onClose: () => void;
  onUpdate: (game: Game) => void;
  onConfirm: () => void;
}) {
  const [tab, setTab] = useState<"The plan" | "Tables & scores">("The plan");
  const [pollResponse, setPollResponse] = useState<
    "available" | "maybe" | "unavailable"
  >(
    game.response === "maybe" || game.response === "unavailable"
      ? game.response
      : "available",
  );
  const [chosenSlots, setChosenSlots] = useState(game.selectedSlots);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cancelPending, setCancelPending] = useState(false);
  const date = dateParts(game.startsAt);
  function action(fn: () => void, success: string) {
    try {
      fn();
      setError("");
      setMessage(success);
    } catch (error) {
      setError((error as Error).message);
      setMessage("");
    }
  }
  return (
    <Dialog title={game.title} onClose={onClose} wide>
      {tab === "The plan" && (
        <div className={`detail-art ${game.art}`}>
          <TileArtwork variant={game.art} />
          <span className="detail-art-label">GOOD COMPANY. GREAT HANDS.</span>
        </div>
      )}
      <div className="detail-meta">
        <span>
          <Icon name="calendar" size={16} />
          {date.long}
        </span>
        <span>
          <Icon name="clock" size={16} />
          {game.kind === "poll"
            ? "Time to be decided"
            : `${date.time} · Pacific`}
        </span>
        <span>
          <Icon name="pin" size={16} />
          {game.venue} · fictional venue
        </span>
        <span>
          <Icon
            name={
              game.visibility === "Public"
                ? "globe"
                : game.visibility === "Private"
                  ? "lock"
                  : "people"
            }
            size={16}
          />
          {game.visibility}
          {game.joinCode && ` · code ${game.joinCode}`}
        </span>
      </div>
      <div className="detail-tabs">
        {(["The plan", "Tables & scores"] as const).map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={tab === item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "The plan" ? (
        <>
          <div className="detail-heading">
            <div>
              <p className="eyebrow">
                {game.tables[0].sessions.at(-1)?.rules.variant.toUpperCase()}{" "}
                MAHJONG
              </p>
              <h3>
                {game.kind === "poll"
                  ? "Let’s find a time."
                  : game.response === "accepted"
                    ? "Your seat is saved. In this demo."
                    : "There’s a seat for you."}
              </h3>
            </div>
            <span className="pill">
              {game.tables.length}{" "}
              {game.tables.length === 1 ? "table" : "tables"}
            </span>
          </div>
          {game.kind === "poll" ? (
            <form
              className="rsvp-panel"
              onSubmit={(event) => {
                event.preventDefault();
                action(
                  () =>
                    onUpdate(respondToPoll(game, pollResponse, chosenSlots)),
                  "Demo response updated. This is availability, not a confirmed seat.",
                );
              }}
            >
              <fieldset>
                <legend>Could you make it?</legend>
                <div className="response-options">
                  {(["available", "maybe", "unavailable"] as const).map(
                    (response) => (
                      <label
                        key={response}
                        className={pollResponse === response ? "selected" : ""}
                      >
                        <input
                          type="radio"
                          name="availability"
                          value={response}
                          checked={pollResponse === response}
                          onChange={() => setPollResponse(response)}
                        />
                        {response === "available"
                          ? "I’m available"
                          : response === "maybe"
                            ? "Maybe"
                            : "Not this time"}
                      </label>
                    ),
                  )}
                </div>
              </fieldset>
              {pollResponse !== "unavailable" && (
                <fieldset className="slot-options">
                  <legend>Choose every time that could work</legend>
                  {game.slots.map((slot) => (
                    <label key={slot}>
                      <input
                        type="checkbox"
                        checked={chosenSlots.includes(slot)}
                        onChange={() =>
                          setChosenSlots((current) =>
                            current.includes(slot)
                              ? current.filter((item) => item !== slot)
                              : [...current, slot],
                          )
                        }
                      />
                      {slot}
                    </label>
                  ))}
                </fieldset>
              )}
              <button className="button button-dark" type="submit">
                Save demo availability
                <Icon name="check" size={16} />
              </button>
              <p className="fine-print">
                Pacific time · Only stored in this tab · Organizer confirmation
                comes later.
              </p>
            </form>
          ) : (
            <div className="rsvp-panel">
              <div className="rsvp-summary">
                <div className="avatar-stack">
                  {game.tables
                    .flatMap((table) => table.players)
                    .slice(0, 4)
                    .map((name) => (
                      <Avatar key={name} name={name} size="small" />
                    ))}
                </div>
                <span>
                  {game.maxAttendees === null
                    ? `${seats(game)} attending · no limit`
                    : `${seats(game)} of ${game.maxAttendees} attending`}{" "}
                  · {fullTables(game)} complete{" "}
                  {fullTables(game) === 1 ? "table" : "tables"}
                </span>
              </div>
              {game.response === "accepted" ? (
                cancelPending ? (
                  <div className="cancel-confirm">
                    <p>
                      Release your demo seat? Your table may need a substitute.
                    </p>
                    <button
                      type="button"
                      className="button button-dark"
                      onClick={() => {
                        onUpdate(cancelSeat(game));
                        setCancelPending(false);
                        setMessage(
                          "Demo seat released. The table now needs a substitute. No notification was sent.",
                        );
                      }}
                    >
                      Yes, release my seat
                    </button>
                    <button
                      type="button"
                      className="button button-quiet"
                      onClick={() => setCancelPending(false)}
                    >
                      Keep my seat
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="accepted-line">
                      <Icon name="check" size={17} />
                      You&apos;re confirmed in this demo.
                    </p>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setCancelPending(true)}
                    >
                      Cancel my seat
                    </button>
                  </>
                )
              ) : (
                <button
                  type="button"
                  className="button button-dark"
                  onClick={() =>
                    action(
                      onConfirm,
                      "Demo seat confirmed. Nothing was sent to a server or another player.",
                    )
                  }
                >
                  Confirm my demo seat
                  <Icon name="arrow" size={16} />
                </button>
              )}
              <p className="fine-print">
                Four accepted players make a table. Sample rules:{" "}
                {game.tables[0].sessions.at(-1)?.rules.variant}
                {game.tables[0].sessions.at(-1)?.rules.variant === "American" &&
                  ` · ${game.tables[0].sessions.at(-1)?.rules.year}`}{" "}
                · Manual hand values.
              </p>
            </div>
          )}
          {game.notes && (
            <>
              <h3 className="subheading">Notes</h3>
              <p className="game-notes">{game.notes}</p>
            </>
          )}
          <h3 className="subheading">The little details</h3>
          <div className="duties">
            {game.duties.map((duty) => (
              <div className="duty" key={duty.task}>
                <span>{duty.task}</span>
                <strong>{duty.person}</strong>
                {duty.person === "Open" && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      onUpdate({
                        ...game,
                        duties: game.duties.map((item) =>
                          item.task === duty.task
                            ? { ...item, person: DEMO_PLAYER }
                            : item,
                        ),
                      });
                      setMessage("Demo duty claimed. No one was notified.");
                    }}
                  >
                    I can help
                  </button>
                )}
                {duty.person === DEMO_PLAYER && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      onUpdate({
                        ...game,
                        duties: game.duties.map((item) =>
                          item.task === duty.task
                            ? { ...item, person: "Open" }
                            : item,
                        ),
                      })
                    }
                  >
                    Release
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <ScoreTables game={game} onUpdate={onUpdate} />
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
      <p className="demo-note">
        Prototype only · Fictional people and venues · Refreshing clears
        changes.
      </p>
    </Dialog>
  );
}

function ScoreTables({
  game,
  onUpdate,
}: {
  game: Game;
  onUpdate: (game: Game) => void;
}) {
  const [tableId, setTableId] = useState(game.tables[0].id);
  const table = game.tables.find((table) => table.id === tableId)!;
  return (
    <div className="scores-view">
      <p className="modal-intro">
        A separate session for each table. American Mahjong, with your own card
        year and house rules.
      </p>
      <div className="table-selector">
        {game.tables.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={item.id === tableId}
            className={item.id === tableId ? "active" : ""}
            onClick={() => setTableId(item.id)}
          >
            Table {item.id}
            <span>{item.players.length}/4</span>
          </button>
        ))}
      </div>
      <div className="seats-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="seat" key={index}>
            {table.players[index] ? (
              <>
                <Avatar name={table.players[index]} size="small" />
                <span>{table.players[index]}</span>
              </>
            ) : (
              <>
                <span className="empty-seat">
                  <Icon name="plus" size={14} />
                </span>
                <span>Open seat</span>
              </>
            )}
          </div>
        ))}
      </div>
      {table.players.length < 4 && (
        <p className="info-box compact">
          {game.kind === "poll"
            ? "This poll has no confirmed table yet. Scores become available after scheduling and four acceptances."
            : "This table needs four accepted players before recording a hand. Other confirmed tables can still play."}
        </p>
      )}
      <SessionEditor
        key={table.id}
        table={table}
        onUpdate={(updated) =>
          onUpdate({
            ...game,
            tables: game.tables.map((item) =>
              item.id === updated.id ? updated : item,
            ),
          })
        }
      />
    </div>
  );
}
function SessionEditor({
  table,
  onUpdate,
}: {
  table: Table;
  onUpdate: (table: Table) => void;
}) {
  const [sessionId, setSessionId] = useState(table.sessions.at(-1)!.id);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const active = table.sessions.find((session) => session.id === sessionId)!;
  const isLatest = table.sessions.at(-1)?.id === active.id;
  function update(session: Session) {
    onUpdate({
      ...table,
      sessions: table.sessions.map((item) =>
        item.id === session.id ? session : item,
      ),
    });
  }
  function attempt(fn: () => void, success = "") {
    try {
      fn();
      setError("");
      setMessage(success);
    } catch (error) {
      setError((error as Error).message);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    attempt(() => {
      update(
        recordHand(active, table, {
          id: demoId(),
          winner: String(data.get("winner")),
          points: Number(data.get("points")),
        }),
      );
      form.reset();
    }, "Hand recorded in this tab only. No settlements calculated.");
  }
  return (
    <div className="session-editor">
      <div className="session-heading">
        <h3>
          Table {table.id} · Session {active.id}
        </h3>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            attempt(() => {
              const id = String(table.sessions.length + 1);
              onUpdate(newSession(table, id));
              setSessionId(id);
            }, "New demo session started. Previous rules and scores are preserved.")
          }
        >
          New session
          <Icon name="plus" size={14} />
        </button>
      </div>
      {table.sessions.length > 1 && (
        <label className="field">
          View session
          <select
            value={sessionId}
            onChange={(event) => {
              setSessionId(event.target.value);
              setMessage("");
              setError("");
            }}
          >
            {table.sessions.map((session) => (
              <option key={session.id} value={session.id}>
                Session {session.id}
                {session.id === table.sessions.at(-1)?.id
                  ? " · current"
                  : " · previous"}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="rules-grid">
        <label className="field">
          Mahjong type
          <input value={active.rules.variant} readOnly />
        </label>
        {active.rules.variant === "American" && (
          <label className="field">
            NMJL card year
            <select
              aria-label="NMJL card year"
              value={active.rules.year}
              disabled={active.hands.length > 0 || !isLatest}
              onChange={(event) =>
                attempt(() =>
                  update(
                    changeRules(active, { year: Number(event.target.value) }),
                  ),
                )
              }
            >
              {[2025, 2026, 2027].map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          Rules profile
          <select
            aria-label="Rules profile"
            value={active.rules.profile}
            disabled={active.hands.length > 0 || !isLatest}
            onChange={(event) =>
              attempt(() =>
                update(
                  changeRules(active, {
                    profile: event.target.value as
                      "Crew standard" | "House rules",
                  }),
                ),
              )
            }
          >
            <option>Crew standard</option>
            <option>House rules</option>
          </select>
        </label>
      </div>
      <label className="field">
        House rules / notes
        <textarea
          rows={2}
          value={active.rules.notes}
          disabled={active.hands.length > 0 || !isLatest}
          onChange={(event) =>
            attempt(() =>
              update(changeRules(active, { notes: event.target.value })),
            )
          }
        />
      </label>
      <p className="fine-print">
        {active.hands.length || !isLatest
          ? "Rules preserved for this session. Start a new session to change them."
          : "Rules lock when the first hand is recorded."}{" "}
        Manual entries only; no NMJL card content or automatic validation.
      </p>
      <div className="hand-list">
        <div className="hand-list-title">
          <span>Recorded hands</span>
          <span>Hand value</span>
        </div>
        {active.hands.length ? (
          active.hands.map((hand, index) => (
            <div className="hand-row" key={hand.id}>
              <span>
                <small>{String(index + 1).padStart(2, "0")}</small>
                {hand.winner}
              </span>
              <strong>
                {hand.winner === "Draw" ? "Draw" : `${hand.points} pts`}
              </strong>
            </div>
          ))
        ) : (
          <p className="no-hands">A fresh table. No hands recorded yet.</p>
        )}
      </div>
      {isLatest && (
        <form className="record-form" onSubmit={submit}>
          <label className="field">
            Winner / result
            <select name="winner" required disabled={table.players.length < 4}>
              <option value="">Choose a player</option>
              {table.players.map((player) => (
                <option key={player}>{player}</option>
              ))}
              <option>Draw</option>
            </select>
          </label>
          <label className="field">
            Hand value (points)
            <input
              name="points"
              type="number"
              min="0"
              max="10000"
              step="1"
              defaultValue="25"
              required
              disabled={table.players.length < 4}
            />
          </label>
          <button
            type="submit"
            className="button button-dark"
            disabled={table.players.length < 4}
          >
            <Icon name="plus" size={16} />
            Record hand
          </button>
        </form>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

const VISIBILITY: { value: Visibility; icon: IconName; hint: string }[] = [
  { value: "Public", icon: "globe", hint: "Visible to all users" },
  {
    value: "Friends Only",
    icon: "people",
    hint: "Only your confirmed friends",
  },
  { value: "Private", icon: "lock", hint: "Requires a join code" },
];
function CreateGame({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (game: Game) => void;
}) {
  const [error, setError] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("Private");
  const [code, setCode] = useState(() => joinCode());
  const [copied, setCopied] = useState("");
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied("Code copied.");
    } catch {
      setCopied("Copy isn’t available here. Select the code to copy it.");
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title")).trim();
    const venue = String(data.get("venue")).trim();
    const max = String(data.get("max")).trim();
    const maxAttendees = max ? Number(max) : null;
    if (!title || !venue) {
      setError("Add a game title and a fictional location.");
      return;
    }
    if (
      maxAttendees !== null &&
      (!Number.isInteger(maxAttendees) || maxAttendees < 1)
    ) {
      setError("Max attendees must be a whole number, or blank for unlimited.");
      return;
    }
    const variant = data.get("type") as MahjongType;
    const notes = String(data.get("notes")).trim();
    const game: Game = {
      id: demoId(),
      title,
      venue,
      startsAt: `${data.get("date")}T${data.get("time")}`,
      duration: 180,
      kind: "invitation",
      art: "silver",
      response: "pending",
      selectedSlots: [],
      slots: [],
      maxAttendees,
      visibility,
      joinCode: visibility === "Private" ? code : undefined,
      notes: notes || undefined,
      tables: Array.from({ length: tablesFor(maxAttendees) }, (_, index) => ({
        id: String(index + 1),
        players: [],
        sessions: [
          { id: "1", rules: { ...standardRules, variant }, hands: [] },
        ],
      })),
      duties: [
        { task: "Host", person: DEMO_PLAYER },
        { task: "Tiles & racks", person: "Open" },
        { task: "Refreshments", person: "Open" },
      ],
    };
    onCreate(game);
  }
  const required = (
    <span className="required" aria-hidden="true">
      *
    </span>
  );
  return (
    <Dialog title="New Game" onClose={onClose}>
      <p className="modal-intro">Schedule a mahjong game.</p>
      <form className="create-form" onSubmit={submit}>
        <label className="field">
          <span>Game Title {required}</span>
          <input
            name="title"
            placeholder="e.g. Friday Night Mahjong"
            required
            maxLength={70}
          />
        </label>
        <fieldset className="field date-time">
          <legend>Date &amp; Time {required}</legend>
          <div className="form-two">
            <input
              aria-label="Date"
              name="date"
              type="date"
              defaultValue="2026-10-29"
              required
            />
            <input
              aria-label="Start time, Pacific"
              name="time"
              type="time"
              defaultValue="13:00"
              max="20:59"
              required
            />
          </div>
        </fieldset>
        <label className="field">
          <span>Location {required}</span>
          <input
            name="venue"
            placeholder="e.g. Community Center"
            required
            maxLength={80}
          />
        </label>
        <label className="field">
          Mahjong Type
          <select name="type" defaultValue="American">
            <option value="American">American Mahjong</option>
            <option value="Chinese">Chinese Mahjong</option>
          </select>
        </label>
        <label className="field">
          <span>
            Max Attendees{" "}
            <span className="field-hint">(leave blank for unlimited)</span>
          </span>
          <input
            name="max"
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            step={1}
            placeholder="e.g. 8"
          />
        </label>
        <fieldset className="field">
          <legend>Visibility {required}</legend>
          <div className="visibility-options">
            {VISIBILITY.map((option) => (
              <label
                key={option.value}
                className={visibility === option.value ? "selected" : ""}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option.value}
                  checked={visibility === option.value}
                  onChange={() => setVisibility(option.value)}
                />
                <Icon name={option.icon} size={20} />
                <strong>{option.value}</strong>
                <small>{option.hint}</small>
              </label>
            ))}
          </div>
        </fieldset>
        {visibility === "Private" && (
          <div className="field">
            <span id="join-code-label">Join Code</span>
            <div className="join-code">
              <output aria-labelledby="join-code-label">{code}</output>
              <button
                type="button"
                className="icon-button"
                aria-label="New join code"
                onClick={() => {
                  setCode(joinCode());
                  setCopied("");
                }}
              >
                <Icon name="refresh" size={18} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Copy join code"
                onClick={copyCode}
              >
                <Icon name="copy" size={18} />
              </button>
            </div>
            <span role="status">
              {copied || "Share this code with players you want to invite."}
            </span>
          </div>
        )}
        <label className="field">
          Notes
          <textarea
            name="notes"
            rows={3}
            maxLength={500}
            placeholder="Any additional info…"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button-dark full-width">
          Schedule Game
          <Icon name="arrow" size={16} />
        </button>
        <p className="demo-note">
          In-memory preview only. No real event, booking, invitation, or join
          code is created. {TIME_ZONE} times. Card year and house rules can be
          set per table under Tables &amp; scores.
        </p>
      </form>
    </Dialog>
  );
}
