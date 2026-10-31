export interface ExemptChange {
  appId: number | null;
  name: string | null;
  previous: { appId: number; name: string } | null;
  announce: boolean;
}
