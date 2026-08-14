type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type CacheMeta = {
  hit: boolean;
  key: string;
  ttlSeconds: number;
  expiresAt: string;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<{ data: T; cache: CacheMeta }> {
  const now = Date.now();
  const cached = memoryCache.get(key) as CacheEntry<T> | undefined;

  if (cached && cached.expiresAt > now) {
    return {
      data: cached.value,
      cache: {
        hit: true,
        key,
        ttlSeconds,
        expiresAt: new Date(cached.expiresAt).toISOString(),
      },
    };
  }

  const value = await producer();
  const expiresAt = now + ttlSeconds * 1000;
  memoryCache.set(key, { value, expiresAt });

  return {
    data: value,
    cache: {
      hit: false,
      key,
      ttlSeconds,
      expiresAt: new Date(expiresAt).toISOString(),
    },
  };
}
