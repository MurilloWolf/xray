import type { TrackCatalogEntry } from '../shared/types';

type CatalogResponse = {
  ok: boolean;
  data?: {
    tracks?: TrackCatalogEntry[];
  };
};

export function createCatalogMap(catalog: TrackCatalogEntry[]): Map<string, TrackCatalogEntry> {
  return new Map(catalog.map((entry) => [entry.trackName, entry]));
}

export async function fetchCatalog(endpoint: string): Promise<TrackCatalogEntry[]> {
  const response = await fetch(endpoint, { method: 'GET', cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch track catalog (${response.status})`);
  }

  const payload = (await response.json()) as CatalogResponse;
  if (!payload.ok || !payload.data?.tracks) {
    throw new Error('Invalid track catalog response');
  }

  return payload.data.tracks;
}
