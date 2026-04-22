let cache = null;
let cacheAt = 0;
let inflight = null;
const TTL = 60_000;

export function getStatsCache() {
  if (cache && Date.now() - cacheAt < TTL) return cache;
  return null;
}

export function setStatsCache(data) {
  cache = data;
  cacheAt = Date.now();
}

export function invalidateStatsCache() {
  cache = null;
}

export function getOrFetch(fetchFn) {
  const cached = getStatsCache();
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = fetchFn()
    .then((data) => { setStatsCache(data); return data; })
    .finally(() => { inflight = null; });
  return inflight;
}
