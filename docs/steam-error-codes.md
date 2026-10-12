# Steam / steam-user Error Codes — What Can Kill steamidled

Catalogue of error conditions (`EResult` codes and non-EResult throws) that can
stop or crash the application, how `steam-user@5.3.0` surfaces each, and what
`steamidled` currently does in response.

> Historical note: §2 and §3 describe the resume logic as it was when this
> research was written. The hardening pass (§6) and the later audit changed it:
> failures are classified by eresult, terminal ones stop immediately, rate limits
> back off exponentially, non-fatal disconnects defer to steam-user's own
> reconnect loop, and transient startup failures no longer delete credentials.
> `src/index.ts` is the source of truth.

Sources of truth: the installed enum
(`node_modules/steam-user/enums/EResult.js`), the logon component
(`node_modules/steam-user/components/09-logon.js`), and the app's own handling
in `src/index.ts` / `src/steam/client.ts`.

---

## 1. How steam-user surfaces failures

Three distinct channels — only some are catchable:

### `error` event (fatal)
Emitted on a **fatal** disconnect, or when `autoRelogin` is off. The `Error`
object carries an `.eresult` (numeric `EResult`). **If unhandled, the process
crashes.** steamidled does handle it (`src/index.ts:670`), routing it to the
resume flow.

### `disconnected` event (non-fatal)
Emitted on a non-fatal disconnect. steam-user keeps the session and retries
internally (`autoRelogin`, default `true`). steamidled also listens
(`src/index.ts:662`).

### Fatal vs non-fatal split (from source)
`_handleLogOff` (`09-logon.js:631-686`) decides:

```
nonFatalLogOffResults = [ 0, Fail(2), NoConnection(3),
                          ServiceUnavailable(20), TryAnotherCM(48) ]
fatal = !(autoRelogin && result ∈ nonFatalLogOffResults)
if (!_relogging && fatal && !_loggingOff)  → emit 'error'   // crash if unhandled
else                                       → emit 'disconnected' + auto-reconnect
```

So **any disconnect whose `EResult` is not in that 5-item allow-list is "fatal"**
and arrives on the `error` event. eresult `0` (Invalid) = raw socket close with
no `LoggedOff` message from Steam.

### Synchronous / async throws (separate from events)
Some failures are thrown, not emitted:
- `logOn()` while already connected → throws **"Already logged on, cannot log on
  again"** from inside `process.nextTick` → **uncatchable**, crashes the process
  (documented behavior; see code comments at `src/index.ts:144-152` and
  `src/steam/client.ts:22-24`).
- The app's own wrappers throw synchronously: `setGamesPlaying`/`stopPlaying`
  throw `"Not logged in"` (`src/steam/client.ts:246`), and a future `relog()`
  wrapper would throw `"Cannot relog if not already connected"`.

---

## 2. How steamidled reacts (the resume state machine)

`error` and `disconnected` both call `enterWaitingState()`
(`src/index.ts:122`) → freeze elapsed time, then poll `attemptResume()` every
`RESUME_RETRY_MS = 60_000` (`src/index.ts:36`).

`attemptResume()` (`src/index.ts:140`) re-logs with the stored refresh token and
**classifies failures by the error message string** (not by eresult)
(`src/index.ts:171`):

```js
isAuthFailure = /refresh token|access denied|invalid|expired/i.test(message)
```

- **auth failure** → `authFailureCount++`; give up at
  `AUTH_FAILURE_RETRY_LIMIT = 15` (`src/index.ts:37`).
- **everything else** → `generalFailureCount++`; give up at
  `GENERAL_FAILURE_RETRY_LIMIT = 30` (`src/index.ts:38`).

On giving up → `handleShutdown()` → `process.exit(0)`.

> Because steam-user's error message equals the `EResult` *name*, the regex
> effectively buckets by name: `InvalidPassword`, `AccessDenied`, `Expired`,
> `CachedCredentialInvalid` (contains "Invalid") land in the 15-retry auth
> bucket; `Banned`, `RateLimitExceeded`, `Revoked`, `AccountDisabled` land in the
> 30-retry general bucket — which keeps hammering a hopeless or harmful login.

Takeover detection: `TAKEOVER_ERESULTS = {6, 34}` (`src/index.ts:35`) plus a
message regex for `LoggedInElsewhere`/`LogonSessionReplaced`
(`src/index.ts:116`). Takeovers resume normally.

---

## 3. The actual app-kill vectors

| Class | Trigger | Outcome |
|-------|---------|---------|
| **A. Hard crash** | Uncatchable async throw — esp. `logOn` while already connected ("Already logged on"); or a synchronous `"Not logged in"` throw from `setGamesPlaying`/`stopPlaying` invoked while logged out. **No `process.on('uncaughtException'/'unhandledRejection')` handler exists.** | Process dies, non-zero. systemd `Restart=on-failure` would restart it. |
| **B. Graceful give-up** | Resume retries exhausted (auth 15× or general 30×, each 60s apart), or no stored credentials at resume. | `handleShutdown()` → `exit(0)`. systemd will **not** restart (clean exit). Idling silently stops. |
| **C. Startup failure** | Login fails, no games, no favorites (headless). | `exit(1)` via `main().catch` / explicit `process.exit(1)`. |
| **D. Rate-limit escalation** | `RateLimitExceeded(84)` / `AccountLoginDeniedThrottle(87)` during resume → 30 retries × 60s = ~30 min of continuous login attempts → **escalates** the Steam cooldown (30 min → hours → up to 24 h). | Eventually class B, but self-inflicted: makes the lockout worse and can lock the account out of normal clients too. |

Class **A** is the literal "kills the application" answer; class **B/D** stop
idling without a crash.

---

## 4. EResult reference (codes relevant to logon / idle / resume)

`name(code)`. "Fatal?" = whether steam-user emits it as `error` (per §1).
"App behavior" = what steamidled does today.

### Transient / network — recoverable
| Code | Name | steam-user | App behavior |
|------|------|-----------|--------------|
| 0 | Invalid (raw socket close) | non-fatal | disconnected → resume |
| 2 | Fail | non-fatal | disconnected → resume |
| 3 | NoConnection | non-fatal | disconnected → resume |
| 10 | Busy | fatal | error → general bucket (30×) |
| 16 | Timeout | fatal | error → general bucket (30×) |
| 20 | ServiceUnavailable | non-fatal | disconnected → resume |
| 35 | ConnectFailed | fatal | error → general bucket (30×) |
| 36 | HandshakeFailed | fatal | error → general bucket (30×) |
| 37 | IOFailure | fatal | error → general bucket (30×) |
| 38 | RemoteDisconnect | fatal | error → general bucket (30×) |
| 48 | TryAnotherCM | non-fatal | disconnected → resume |

### Session takeover — recoverable (expected during normal use)
| Code | Name | App behavior |
|------|------|--------------|
| 6 | LoggedInElsewhere | takeover → wait → resume |
| 34 | LogonSessionReplaced | takeover → wait → resume |
| 50 | AlreadyLoggedInElsewhere | not in `TAKEOVER_ERESULTS`, but caught by message regex → resume |
| 49 | PasswordRequiredToKickSession | general bucket; resume likely fails |

### Credential / auth — usually terminal (15-retry auth bucket if name matches regex)
| Code | Name | App behavior / note |
|------|------|---------------------|
| 5 | InvalidPassword | auth bucket (matches "invalid") → 15× then exit |
| 15 | AccessDenied | auth bucket (matches "access denied") → 15× then exit |
| 25 | LimitExceeded | general bucket |
| 26 | Revoked (token revoked) | general bucket (no regex match) → 30× futile |
| 27 | Expired (token expired) | auth bucket (matches "expired") → 15× then exit |
| 63 | AccountLogonDenied (email Steam Guard) | only at credential login, not refresh-token resume |
| 65 | InvalidLoginAuthCode | credential-login only |
| 85 | AccountLoginDeniedNeedTwoFactor | credential-login only |
| 88 | TwoFactorCodeMismatch | credential-login only |
| 126 | CachedCredentialInvalid | auth bucket (matches "invalid") → 15× then exit |

### Rate limiting — dangerous (see §3-D)
| Code | Name | App behavior / note |
|------|------|---------------------|
| 84 | RateLimitExceeded | general bucket → 30× × 60s **escalates** lockout |
| 87 | AccountLoginDeniedThrottle | general bucket → same escalation risk |

### Account-level — terminal, resume is futile
| Code | Name | App behavior / note |
|------|------|---------------------|
| 17 | Banned | general bucket → 30× futile → exit |
| 43 | AccountDisabled | general bucket → futile |
| 51 | Suspended | general bucket → futile |
| 73 | AccountLockedDown | general bucket → futile |
| 95 | AccountLimitExceeded | general bucket → futile |
| 114 | AccountDeleted | general bucket → futile |
| 69 | ParentalControlRestricted | general bucket → futile |

### Client / protocol — terminal
| Code | Name | App behavior / note |
|------|------|---------------------|
| 7 | InvalidProtocolVer | general bucket; needs library update |
| 119 | LauncherMigrated / ClientNoLongerSupported | general bucket; needs update |
| 120 | SteamRealmMismatch | general bucket |

> Full enum: `node_modules/steam-user/enums/EResult.js` (values 0–129). Most
> non-logon codes (store, inventory, friends, etc.) never reach the idle loop.

---

## 5. Non-EResult crash vectors (no error code attached)

- **"Already logged on, cannot log on again"** — `logOn` during an existing
  session, thrown in `process.nextTick`, **uncatchable**. The single most likely
  hard-crash. Guarded today by the `client.isConnected` check in `attemptResume`
  (`src/index.ts:148`) and the persistent `loggedOn`/`disconnected` listeners
  (`src/steam/client.ts:25-31`); a future `relog()` path must preserve those
  guards. Ref commit `63357cf` ("random steam logon error after long continuous
  idling").
- **"Not logged in"** — `setGamesPlaying`/`stopPlaying` (`src/steam/client.ts:246`)
  called while `_isLoggedIn === false`. Reachable from `tickRandomizer`
  (`index.ts:109`), `restoreIdling` (`index.ts:208`), `handlePlayingState`
  (`index.ts:594/628`), none wrapped in try/catch.
- **Unhandled promise rejection** anywhere in the async resume path — there is no
  global `unhandledRejection`/`uncaughtException` handler, so any escaping
  rejection terminates the process.

---

## 6. Recommendations

> Status: all five implemented. #1 (global `uncaughtException`/`unhandledRejection`
> net + persistent constructor `error` listener) landed with the flush/zombie work;
> #2 (eresult-based resume classification), #3 (exponential backoff on 84/87, capped
> at 30min), #4 (wrapper no-op guards), and #5 (distinct give-up exit codes) landed
> in the error-handling hardening pass.

1. **Add a global safety net:** `process.on('uncaughtException')` and
   `process.on('unhandledRejection')` that log + funnel into `enterWaitingState`
   (or a controlled restart) instead of dying. Converts class-A crashes into
   recoverable waits.
2. **Classify resume failures by `eresult`, not message** (`src/index.ts:171`).
   Treat account-level (17/43/51/73/95/114) and protocol (7/119/120) as
   *terminal-now* (stop fast, alert) rather than 30 futile retries.
3. **Back off harder on rate limits (84/87):** switch from fixed 60s to
   exponential backoff capped high (e.g. 30 min) to avoid escalating the Steam
   lockout described in §3-D.
4. **Guard the wrapper throws:** make `setGamesPlaying`/`stopPlaying` no-op (or
   defer) when not logged in, so a mistimed call cannot crash the daemon.
5. **Distinguish exit codes:** class-B give-up currently uses `exit(0)`, which
   stops a systemd `Restart=on-failure` unit from restarting. Consider a
   non-zero code for "gave up but could retry later".

---

## Sources
- `node_modules/steam-user/enums/EResult.js` (installed v5.3.0 enum)
- `node_modules/steam-user/components/09-logon.js` (fatal/non-fatal logoff logic)
- [node-steam-user — GitHub](https://github.com/DoctorMcKay/node-steam-user)
- [node-steam-user #481 — "Already logged on" is uncatchable](https://github.com/DoctorMcKay/node-steam-user/issues/481)
- [McKay Dev — fatal error clarification](https://dev.doctormckay.com/topic/3902-fatal-error-clarification/)
- [Steam rate limit / "too many login failures" (30 min–24 h cooldown)](https://www.makeuseof.com/how-to-fix-too-many-login-or-signin-failures-error-steam/)
- [SteamDesktopAuthenticator #897 — RateLimitExceeded](https://github.com/Jessecar96/SteamDesktopAuthenticator/issues/897)
