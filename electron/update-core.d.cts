// update-core.cjs için tür tanımları (testlerde kullanılır).
export interface ReleaseAsset { name: string; size: number; url: string; digest: string | null }
export interface LatestRelease { version: string; title: string; notes: string; page: string; asset: ReleaseAsset | null }
type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<Response>;

export const RELEASES_API: string;
export const RELEASES_PAGE: string;
export const EXE_NAME: string;
export function parseVersion(v: unknown): number[] | null;
export function isNewer(a: string, b: string): boolean;
export function pickAsset(release: { assets?: Array<{ name: string }> }): { name: string } | null;
export function fetchLatest(fetchImpl: FetchLike, url?: string): Promise<LatestRelease>;
export function canWrite(dir: string): boolean;
export function downloadAsset(fetchImpl: FetchLike, asset: ReleaseAsset, destDir: string, onProgress?: (p: number) => void): Promise<string>;
export function installUpdate(exePath: string, newFile: string): string;
export function cleanupLeftovers(exePath: string): void;
