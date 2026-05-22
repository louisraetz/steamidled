# Steam Playtime & Idling — Research Notes

Research into how Steam tracks game playtime, how it commits/resets, how the
`node-steam-user` JS SDK exposes it, and what this means for `steamidled`.

> Caveat: Steam does not publicly document the internal playtime-commit
> protocol. Items marked **(lore)** come from community reports/forums, not
> official Valve documentation, and should be treated as approximate.

---

## 1. How Steam tracks hours

- **Session-based, server-authoritative.** Steam does not measure whether you
  are actually playing. It measures whether a game process is *registered as
  running* while the client is online and logged in. Minimized, idle at menu,
  or AFK all count.
- **The server decides hours, not the client.** The client only announces "I am
  playing appid X". The server attributes wall-clock time to that appid while
  the announcement is active. This is exactly why idling works without a real
  game binary.

## 2. Commit interval

- Playtime is **not** written to the server in real time. Lore: committed
  roughly **every ~30 minutes while playing, plus once on clean exit** (the
  final delta is flushed when the game stops). **(lore)**
- Reason it is not live: millions of concurrent users; per-second counter writes
  are infeasible. Profile hours therefore lag behind real time.

## 3. Online-at-both-ends requirement

For hours to persist reliably, the client must be online **at launch and at
exit**:

| Launch | Exit | Result |
|--------|------|--------|
| online | online (clean) | all hours sync ✓ |
| online | offline | partial sync to last online checkpoint; remainder becomes a local-only "discrepancy" |
| offline | offline | **zero recorded**; server overwrites local tracking |

Steam has no robust offline→reconnect flush queue, so time accrued after a
silent disconnect is largely lost.

## 4. Two playtime records

- **server hours** — authoritative; shown on profile homepage and Steam Deck.
- **server + discrepancy** — shown in web/app library view; includes
  locally-tracked time not synced to the server.

Mismatch between the two is the "discrepancy" bug users report.

## 5. "Last 2 weeks" stat

- Per-game recent-playtime field (`playtime_2weeks`, in minutes).
- Intended as a rolling 14-day window that rolls off old time.
- Historically buggy (shows last-session even if years old, phantom uninstalled
  games). No documented exact daily-refresh time. Treat as approximate.

## 6. Reset behaviour

- `playtime_forever` (lifetime) is **monotonic** — no user-facing wipe, no
  auto-reset. The only "reset"-like effects are the 2-week stat rolling off, or
  rare server bugs.
- Hiding a game in the library does **not** reset its hours (reverts on Steam
  restart).

---

## 7. Steam JS SDK — `node-steam-user` (DoctorMcKay)

The library `steamidled` is built on.

### `gamesPlayed(apps[, force])`
- Sends `CMsgClientGamesPlayed` → tells Steam "playing these appids".
- **No real game binary needed** — the server attributes time purely from this
  message. This is the entire idling mechanism.
- `apps` formats: int appid (`440`), array of appids, `{game_id, game_extra_info}`,
  string name (non-Steam game), `[]` to stop all.
- `force = true` → calls `kickPlayingSession` first (boots the other active
  session).
- **32-game limit** = Steam protocol cap on simultaneous appids per
  `gamesPlayed` call. (This is the README's "up to 32".)

### `getUserOwnedApps(steamID[, options], callback)`
Functionally equivalent to `IPlayerService/GetOwnedGames`. Per-app fields:
- `playtime_forever` — total lifetime minutes
- `playtime_2weeks` — recent 14-day minutes (nullable)
- `playtime_windows_forever` / `playtime_mac_forever` / `playtime_linux_forever`
- plus `app_count`, icon/logo URLs, stats availability
- options: `includePlayedFreeGames`, `includeFreeSub`, `filterAppids`,
  `includeAppInfo`, `skipUnvettedApps`
- target user's games must not be private.

### Session / takeover
- `LoggedInElsewhere` (EResult) → fires on `error`/`disconnected` when the same
  account logs in elsewhere. Steam allows only one online *playing* instance per
  account. This is the "session takeover" case.
- `kickPlayingSession()` → reclaim the playing slot from another session.
- `requestFreeLicense(appids)` → add free-to-play games to the account so they
  can be idled (the "free" filter).

---

## 8. Incident: 5-day loss after session takeover

**Reported:** idled ~5 days straight; another login triggered a takeover; the
client crashed; ~5 days of playtime appeared lost ("reset").

### Failure chain
1. Another login → `LoggedInElsewhere` → Steam invalidates the session token
   server-side.
2. The idling session dies **ungracefully** — no clean `gamesPlayed([])` stop,
   no clean `logOff()`.
3. Uncommitted session time is discarded.

### Why ~5 days and not ~30 minutes
If the ~30-min checkpoint lore held, loss would be ≤30 min. A 5-day loss means
**checkpoints were not landing for the whole session**. Two explanations:

1. **Zombie session.** The session went stale server-side at some earlier point
   (or a `gamesPlayed`-only idle with no real binary never committed
   incrementally). The client still *looked* connected and kept "idling", but
   checkpoint writes bounced (invalid/stale token). Only a clean logoff would
   have folded the running session-total into `playtime_forever`. Crash → no
   clean logoff → entire tail lost.
2. **Commit-on-clean-exit only.** If real commit cadence is coarser than lore
   and leans on clean exit, an idle-only session's hours sit as a "current
   session" value that never folds until graceful stop. Takeover = no graceful
   stop = dropped.

Either way this is **not a rollback/reset** — lifetime hours do not decrease.
It is *lost uncommitted accrual*: Steam never persisted those days at all.

### Why auto-resume did not help
Auto-resume reconnects *after* the takeover. The damage happens at the moment of
invalidation. Resume only protects future hours; it cannot recover the orphaned
session.

---

## 9. Mitigations for steamidled

1. **Periodic forced flush (cheap insurance).** Every N hours (e.g. 2–4h),
   cycle the idle to force a commit:
   ```js
   gamesPlayed([]);      // stop
   await sleep(~5_000);
   gamesPlayed(apps);    // restart
   ```
   Stop→restart forces the server to fold the current session into
   `playtime_forever`. Caps max loss at the flush interval instead of the whole
   session.

2. **Detect zombie sessions, don't trust the "connected" flag.** Periodically
   snapshot `playtime_forever` for an idled app via `getUserOwnedApps(self)` and
   compare across an interval. If it is not climbing, checkpoints are not
   landing → force a full re-login instead of idling against a dead session.

3. **Graceful flush on shutdown/crash.** Wrap exit paths (SIGTERM,
   `uncaughtException`, takeover-detected) to attempt `gamesPlayed([])` +
   `logOff()` before exiting — best-effort flush to salvage the tail.

4. **On takeover: accept tail loss, log it.** Snapshot last-known-good
   `playtime_forever`; after recovery, compare to quantify drift and confirm
   committing resumed. (Telegram ping already exists for the event.)

Combining #1 + #2 turns a multi-day catastrophe into at-most-a-few-hours loss,
with detection when commits silently die.

---

## 10. Implementation feasibility — periodic flush + zombie detection

Investigated the existing reconnect/idle code (`src/index.ts`,
`src/steam/client.ts`) and the installed `steam-user@5.3.0` to confirm both
mitigations can be wired in cleanly. **Verdict: yes, both fit the existing
architecture with small additions.** Nothing implemented yet — this is the
plan.

### Key enabling primitive: `relog()`

`steam-user` ships `relog()` (`node_modules/steam-user/components/09-logon.js:604`):

- Requires an active connection (`this.steamID`) — throws "Cannot relog if not
  already connected" otherwise.
- Requires a refresh-token or password logon (we log in with a refresh token →
  satisfied). *Assumption to verify: `_logOnDetails.access_token` is populated
  after a refresh-token logon; relog() gates on it.*
- Internally: sets `_relogging = true` → `logOff()` → `_handleLogOff` emits
  `disconnected` → enqueues an automatic reconnect (exponential backoff ~1s) →
  `logOn` → `loggedOn`.

Why this matters: a `logOff` is the closest thing to a Steam "clean exit", which
is the known playtime-commit trigger (§2/§3). So a **periodic relog flushes
playtime AND re-validates the session** (kills a zombie), in one primitive — and
it routes entirely through handlers the project already has.

### How it plugs into existing handlers

The idle loop already wires (`src/index.ts:662-691`):

- `onDisconnected` → `enterWaitingState()` (`index.ts:122`) — freezes elapsed
  time into `accumulatedMs`, clears `updateInterval`, arms `attemptResume` after
  60s, sends a Telegram "🛑 paused".
- `onLoggedOn` → `restoreIdling()` (`index.ts:201`) — re-sends `gamesPlayed`,
  resets each `startTime`, restarts the display loop, sends "▶️ resumed".

A `relog()` therefore self-heals through this exact path: disconnect → wait →
loggedOn → restore. Local time accounting survives intact, because
`enterWaitingState` banks elapsed into `accumulatedMs` and `restoreIdling`
resets `startTime` (verified `index.ts:126-128` + `index.ts:206-207`).

### Mitigation A — periodic flush (recommended: relog-based)

- Add `FLUSH_INTERVAL_MS` (~3–4h) and a `flushTimer`.
- Arm in `startIdling` (`index.ts:635`), clear in `handleShutdown`
  (`index.ts:704`), re-arm after each fire.
- Action when it fires: skip if `isWaitingForResume || isInEditMode ||
  isShuttingDown || idlingGames.length === 0`; else `client.relog()`.
- New `SteamClient.relog()` wrapper around `this.client.relog()` with an
  `isConnected` guard.
- **Telegram-noise problem:** every flush would emit the disconnect→loggedOn
  pair → "🛑 paused"/"▶️ resumed" spam every few hours. Fix: a
  `selfInitiatedRelog` flag set before `relog()` and checked in
  `enterWaitingState`/`restoreIdling` to suppress (or downgrade to a single
  quiet "🔄 flush") those messages. Clear the flag once restored.
- **Race note:** `enterWaitingState` arms `attemptResume` at 60s; relog normally
  reconnects faster and `onLoggedOn`→`restoreIdling` clears that timer. The
  existing `attemptResume` `isConnected` short-circuit (`index.ts:148`) already
  guards the rare overlap. Acceptable; flagging for awareness.

Lighter unverified alternative: cycle `gamesPlayed([])` → wait ~5s →
`gamesPlayed(apps)` (via `stopPlaying`/`setGamesPlaying`, `client.ts:245/258`)
without a reconnect. Avoids the disconnect dance but it is **unconfirmed**
whether a stop/start actually forces a server commit. relog is the safer bet.

### Mitigation B — active zombie detection

- Add `SteamClient.getPlaytimeForever(appid)`: calls
  `getUserOwnedApps(self, { filterAppids: [appid], includeAppInfo: false })`
  and returns `apps[0]?.playtime_forever ?? null`. Cheap single-app probe;
  `filterAppids` confirmed supported (`friends.js:835-851`). Own account is
  already required to be non-private (startup `getOwnedGames`).
- Add `ZOMBIE_CHECK_INTERVAL_MS` (≥ ~90min — must exceed the ~30min commit lore
  to avoid false positives), a `zombieTimer`, and a baseline
  `{ appid, playtime, at }`.
- Logic each tick: pick a currently-idling app; on first run record baseline; on
  later runs, if that app is *still continuously idling* and the window elapsed
  and the freshly-fetched `playtime_forever` did **not** increase → server
  commits are not landing → **zombie** → `client.relog()` + Telegram alert, then
  re-baseline.
- Guards / false-positive avoidance:
  - Only act on a *successful* fetch showing no increase. Network/transient
    error → skip the round, keep baseline.
  - If the probe app left the idling set (entered cooldown via `tickRandomizer`,
    or got paused by `handlePlayingState` because the user actually played) →
    re-baseline, skip.
  - Skip while `isWaitingForResume || isInEditMode || isShuttingDown`.
- Synergy with A: periodic relogs (A) keep commits flowing; the zombie probe (B)
  is the watchdog that confirms they actually are, and forces an immediate relog
  if they silently stopped between scheduled flushes.

### New code surface (summary)

- `src/steam/client.ts`: `relog()` wrapper; `getPlaytimeForever(appid)`.
- `src/index.ts`: 2 constants, 2 timers (`flushTimer`, `zombieTimer`) armed in
  `startIdling` / cleared in `handleShutdown`, a `selfInitiatedRelog`
  suppression flag, and zombie-baseline state. No changes to the core
  reconnect/randomizer logic — both features ride on the existing
  disconnect/loggedOn flow.

### Open assumptions to validate before/while implementing

1. A clean `logOff` (via relog) actually commits the in-flight idle session's
   playtime. (Strongly implied by §2/§3 but not Valve-documented.)
2. `_logOnDetails.access_token` is set after a refresh-token logon, so `relog()`
   does not throw.
3. `playtime_forever` increments at minute granularity quickly enough that a
   ≥90min idling window reliably shows movement when commits are healthy.

---

## Sources
- [node-steam-user (DoctorMcKay) — GitHub](https://github.com/DoctorMcKay/node-steam-user)
- [steam-user — npm](https://www.npmjs.com/package/steam-user)
- [kickPlayingSession — McKay Dev](https://dev.doctormckay.com/topic/1931-kickplayingsession/)
- [How does the hours played timer work? — Steam](https://steamcommunity.com/discussions/forum/1/412446890563789440/)
- [Steam Playtime Statistics — Steam Navigator](https://www.steamnavigator.com/blog/steam-playtime-statistics)
- [Playtime tracking discrepancy / offline — SteamOS issue #2145](https://github.com/ValveSoftware/SteamOS/issues/2145)
- [Incorrect 2-week playtime — Steam Client Beta](https://steamcommunity.com/groups/SteamClientBeta/discussions/0/3546050190331497294/)
- [2-week gameplay hours — Steam Community](https://steamcommunity.com/discussions/forum/7/3135045355762033877/)
