/**
 * On Vercel git-triggered builds, use the latest published data from the `menu-data`
 * branch instead of the snapshot committed in main. Elsewhere (local, CI) it does nothing.
 * If the branch is missing or unreachable, the committed snapshot is used and the build continues.
 */
import { execFileSync } from "node:child_process";

// The refresh workflow builds with the data it just validated (TERRIERTRAY_DATA_PINNED=1).
if (process.env.VERCEL !== "1" || process.env.TERRIERTRAY_DATA_PINNED === "1") process.exit(0);

const git = (...args: string[]) => execFileSync("git", args, { stdio: ["ignore", "pipe", "pipe"] }).toString();

try {
  git("fetch", "--depth=1", "https://github.com/bbrihuang/terriertray.git", "menu-data");
  git("--work-tree=public", "checkout", "FETCH_HEAD", "--", "menus");
  console.log("Using published menu data from the menu-data branch.");
} catch {
  console.warn("menu-data branch unavailable; building with the snapshot committed in main.");
}
