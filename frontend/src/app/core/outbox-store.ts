// Offline mutation outbox backed by IndexedDB (survives reloads).
// No external deps — tiny promise wrapper around the raw IndexedDB API.

export interface OutboxEntry {
  id: string;
  method: 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: any;
  createdAt: number;
  tries: number;
}

const DB_NAME = 'marine-origin';
const STORE = 'outbox';
const DB_VERSION = 1;

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let dbp: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
      req.onblocked = () => reject(new Error('IndexedDB blocked'));
    });
    dbp.catch(() => { dbp = null; });
  }
  return dbp;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const t = d.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        let req: IDBRequest<T>;
        try {
          req = fn(store);
        } catch (e) {
          reject(e);
          return;
        }
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
        t.onerror = () => reject(t.error ?? new Error('IndexedDB transaction failed'));
      })
  );
}

export async function outboxAdd(
  e: Pick<OutboxEntry, 'method' | 'path' | 'body'>
): Promise<string> {
  const entry: OutboxEntry = {
    id: uuid(),
    method: e.method,
    path: e.path,
    body: e.body,
    createdAt: Date.now(),
    tries: 0,
  };
  await run('readwrite', (s) => s.add(entry));
  return entry.id;
}

/** FIFO order: oldest first. */
export async function outboxList(): Promise<OutboxEntry[]> {
  const all = await run('readonly', (s) => s.getAll() as IDBRequest<OutboxEntry[]>);
  return (all ?? []).sort((a, b) => a.createdAt - b.createdAt);
}

export async function outboxRemove(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id) as unknown as IDBRequest<void>);
}

export async function outboxCount(): Promise<number> {
  return run('readonly', (s) => s.count());
}

export async function outboxBumpTries(id: string): Promise<void> {
  const cur = await run('readonly', (s) => s.get(id) as IDBRequest<OutboxEntry | undefined>);
  if (!cur) return;
  await run('readwrite', (s) => s.put({ ...cur, tries: cur.tries + 1 }) as unknown as IDBRequest<void>);
}
