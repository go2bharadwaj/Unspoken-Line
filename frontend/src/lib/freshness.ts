// A tab left open (or restored from memory on a phone) keeps running the bundle it loaded,
// however index.html is cached. This compares that bundle with the one the live index.html names.

/** The hashed entry bundle this page is running, e.g. "/assets/index-CBFJm5pB.js"; null in dev. */
function runningBundle(): string | null {
  const el = document.querySelector<HTMLScriptElement>(
    'script[type="module"][src*="/assets/index-"]',
  );
  return el?.getAttribute("src") ?? null;
}

/** The live bundle's path if it differs from the running one, else null. */
export async function newerVersionDeployed(): Promise<string | null> {
  const mine = runningBundle();
  if (!mine) return null;
  try {
    // no-store skips the HTTP cache, and sw.js lets no-store requests through to the network
    const res = await fetch("/", { cache: "no-store" });
    if (!res.ok) return null;
    const live = (await res.text()).match(/\/assets\/index-[\w-]+\.js/)?.[0];
    return live && live !== mine ? live : null;
  } catch {
    return null; // offline: keep running what we have
  }
}

const RELOADED_FOR_KEY = "unspoken-line.reloaded-for";

/** Reload once per new version; if the reload still lands on the old bundle, don't loop. */
export function reloadOnceFor(live: string): boolean {
  try {
    if (sessionStorage.getItem(RELOADED_FOR_KEY) === live) return false;
    sessionStorage.setItem(RELOADED_FOR_KEY, live);
  } catch {
    return false; // storage blocked: can't guard against a loop, so leave it to the banner
  }
  window.location.reload();
  return true;
}
