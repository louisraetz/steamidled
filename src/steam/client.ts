import SteamUser from 'steam-user';
import type { SteamGame } from '../types/index.js';

// Wrapper class encapsulating Steam user interactions for game idling
export class SteamClient {
  private client: SteamUser;
  private _isLoggedIn = false;
  private _accountName: string | null = null;

  constructor() {
    this.client = new SteamUser();
  }

  get isLoggedIn(): boolean {
    return this._isLoggedIn;
  }

  get accountName(): string | null {
    return this._accountName;
  }

  get steamUser(): SteamUser {
    return this.client;
  }

  // Logs in to Steam using a saved refresh token
  loginWithRefreshToken(refreshToken: string, accountName?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const onLoggedOn = () => {
        this._isLoggedIn = true;
        if (accountName) {
          this._accountName = accountName;
        }
        this.client.setPersona(SteamUser.EPersonaState.Online);
        cleanup();
        resolve();
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        this.client.removeListener('loggedOn', onLoggedOn);
        this.client.removeListener('error', onError);
      };

      this.client.on('loggedOn', onLoggedOn);
      this.client.on('error', onError);

      this.client.logOn({ refreshToken });
    });
  }

  // Logs in to Steam using username and password
  loginWithCredentials(
    accountName: string,
    password: string
  ): Promise<{ refreshToken: string }> {
    return new Promise((resolve, reject) => {
      const onLoggedOn = () => {
        this._isLoggedIn = true;
        this._accountName = accountName;
      };

      const onRefreshToken = (refreshToken: string) => {
        cleanup();
        resolve({ refreshToken });
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        this.client.removeListener('loggedOn', onLoggedOn);
        this.client.removeListener('refreshToken', onRefreshToken);
        this.client.removeListener('error', onError);
      };

      this.client.on('loggedOn', onLoggedOn);
      this.client.on('refreshToken', onRefreshToken);
      this.client.on('error', onError);

      this.client.logOn({
        accountName,
        password,
        rememberPassword: true,
      });
    });
  }

  // Fetches the user's game library from Steam
  async getOwnedGames(): Promise<SteamGame[]> {
    if (!this._isLoggedIn || !this.client.steamID) {
      throw new Error('Not logged in');
    }

    const response = await this.client.getUserOwnedApps(this.client.steamID);

    return response.apps.map((app) => ({
      appid: app.appid,
      name: app.name || `App ${app.appid}`,
      playtime_forever: app.playtime_forever || 0,
    }));
  }

  // Sets which games are currently being idled (max 32)
  setGamesPlaying(appIds: number[]): void {
    if (!this._isLoggedIn) {
      throw new Error('Not logged in');
    }

    if (appIds.length > 32) {
      throw new Error('Cannot idle more than 32 games at once');
    }

    this.client.gamesPlayed(appIds);
  }

  // Stops idling all games
  stopPlaying(): void {
    this.client.gamesPlayed([]);
  }

  // Logs out from Steam and resets state
  logout(): void {
    this.client.logOff();
    this._isLoggedIn = false;
    this._accountName = null;
  }

  // Registers a callback for disconnect events
  onDisconnected(callback: (eresult: number, msg: string) => void): void {
    this.client.on('disconnected', callback);
  }

  // Registers a callback for error events
  onError(callback: (err: Error) => void): void {
    this.client.on('error', callback);
  }

  // Registers a callback for when the user starts or stops playing a game
  onPlayingState(callback: (blocked: boolean, playingApp: number) => void): void {
    this.client.on('playingState', callback);
  }
}
