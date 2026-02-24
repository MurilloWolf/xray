import type { AnalyticsStorageAdapter, StoredAnalyticsEvent } from '../types';

export function createMemoryAdapter(initialEvents: StoredAnalyticsEvent[] = []) {
  const events = [...initialEvents];

  const adapter: AnalyticsStorageAdapter = {
    async save(event) {
      events.push(event);
    },

    async getAll(dateInit?: number, dateEnd?: number) {
      if (dateInit === undefined && dateEnd === undefined) return [...events];

      return events.filter((event) => {
        if (dateInit !== undefined && event.ts < dateInit) return false;
        if (dateEnd !== undefined && event.ts > dateEnd) return false;
        return true;
      });
    },

    async clear(dateInit?: number, dateEnd?: number) {
      const before = events.length;

      if (dateInit === undefined && dateEnd === undefined) {
        events.length = 0;
        return before;
      }

      const kept = events.filter((event) => {
        if (dateInit !== undefined && event.ts < dateInit) return true;
        if (dateEnd !== undefined && event.ts > dateEnd) return true;
        if (dateInit === undefined && dateEnd !== undefined) return event.ts > dateEnd;
        return false;
      });

      events.length = 0;
      events.push(...kept);
      return before - events.length;
    },
  };

  return adapter;
}
