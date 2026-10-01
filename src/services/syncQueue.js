import { powerSync } from '@/api/PowerSyncConnector';
import { supabase } from '@/api/supabaseClient';
import { get, set } from 'idb-keyval';

class SyncQueue {
  constructor() {
    this.queueKey = 'slate_sync_queue';
    this.isSyncing = false;
  }

  async getQueue() {
    const queue = await get(this.queueKey);
    return queue || [];
  }

  async saveQueue(queue) {
    await set(this.queueKey, queue);
  }

  async enqueue(action) {
    const queue = await this.getQueue();
    queue.push({
      ...action,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    });
    await this.saveQueue(queue);
    
    // Attempt immediate sync if online
    if (navigator.onLine) {
      this.sync();
    }
  }

  async sync() {
    // PowerSync natively handles synchronization.
    // We clear the redundant custom syncQueue to prevent double-insertion crashes.
    await set(this.queueKey, []);
  }

  async processItem(item) {
    return;
    const { supabase } = await import('@/api/supabaseClient');
    const { action, payload, endpoint } = item;
    
    if (action === 'POST' || action === 'PUT') {
      let cleanData = action === 'POST' ? payload : payload.data;
      if (cleanData) {
        // Strip out SQLite artifacts (e.g. 'id:1')
        cleanData = Object.fromEntries(Object.entries(cleanData).filter(([k]) => !k.includes(':')));
      }
      await (async () => {
        const _payload = cleanData;
        const _keys = Object.keys(_payload);
        const _vals = Object.values(_payload).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
        if (action === 'POST') {
          await powerSync.execute(`INSERT INTO ${endpoint.replace(/[^a-zA-Z0-9_]/g, '')} (${_keys.join(', ')}) VALUES (${_keys.map(()=>'?').join(', ')})`, _vals);
        } else {
          await powerSync.execute(`UPDATE ${endpoint.replace(/[^a-zA-Z0-9_]/g, '')} SET ${_keys.map(k=>k+' = ?').join(', ')} WHERE id = ?`, [..._vals, cleanData.id]);
        }
      })();
      const error = null;
      if (error) throw error;
    } else if (action === 'DELETE') {
      await powerSync.execute(`DELETE FROM ${endpoint.replace(/['"`]/g, '')} WHERE id = ?`, [payload.id]);
      const error = null;
      if (error) throw error;
    }
  }
}

export const syncQueue = new SyncQueue();

// Listen to network status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncQueue.sync();
  });
}
