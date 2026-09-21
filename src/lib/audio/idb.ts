/**
 * Tiny IndexedDB wrapper. Recordings are written here while you record, so a
 * crashed tab, dead battery or lost Wi-Fi never loses a lecture.
 */
const DB_NAME = 'lecturelab'
const STORE = 'kv'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const idb = {
  get: <T>(key: string) => tx<T | undefined>('readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
  set: (key: string, value: unknown) => tx('readwrite', (s) => s.put(value, key)),
  del: (key: string) => tx('readwrite', (s) => s.delete(key)),
  keys: () => tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys()),
  async delPrefix(prefix: string) {
    const keys = (await this.keys()).filter((k) => String(k).startsWith(prefix))
    for (const k of keys) await this.del(String(k))
  },
}
