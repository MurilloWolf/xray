import { describe, expect, it } from 'vitest';

import { createMemoryAdapter } from '../src';

describe('createMemoryAdapter', () => {
  it('returns all events when no date range is provided', async () => {
    const storage = createMemoryAdapter();

    storage.save({
      name: 'page_view',
      ts: 1000,
      appId: 'app-1',
      props: {},
      receivedAt: 1001,
    });

    storage.save({
      name: 'click_button',
      ts: 2000,
      appId: 'app-1',
      props: {},
      receivedAt: 2001,
    });

    await expect(storage.getAll()).resolves.toHaveLength(2);
  });

  it('filters events by ts range in getAll', async () => {
    const storage = createMemoryAdapter();

    storage.save({ name: 'a', ts: 1000, appId: 'app-1', props: {}, receivedAt: 1001 });
    storage.save({ name: 'b', ts: 2000, appId: 'app-1', props: {}, receivedAt: 2001 });
    storage.save({ name: 'c', ts: 3000, appId: 'app-1', props: {}, receivedAt: 3001 });

    const filtered = await storage.getAll(1500, 2500);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe('b');
  });

  it('removes events by ts range in clear and returns deleted count', async () => {
    const storage = createMemoryAdapter();

    storage.save({ name: 'a', ts: 1000, appId: 'app-1', props: {}, receivedAt: 1001 });
    storage.save({ name: 'b', ts: 2000, appId: 'app-1', props: {}, receivedAt: 2001 });
    storage.save({ name: 'c', ts: 3000, appId: 'app-1', props: {}, receivedAt: 3001 });

    const deleted = await storage.clear(1500, 2500);

    expect(deleted).toBe(1);
    expect((await storage.getAll()).map((item) => item.name)).toEqual(['a', 'c']);
  });
});
