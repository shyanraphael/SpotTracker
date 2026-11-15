const open = () =>
  new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open('spotify-tracker', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('kv')
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
let dbp: Promise<IDBDatabase> | null = null
const db = () => (dbp ??= open())

export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    const d = await db()
    return await new Promise<T | undefined>((res, rej) => {
      const q = d.transaction('kv').objectStore('kv').get(key)
      q.onsuccess = () => res(q.result as T | undefined)
      q.onerror = () => rej(q.error)
    })
  } catch { return undefined }
}
export async function kvSet(key: string, value: unknown): Promise<void> {
  try {
    const d = await db()
    await new Promise<void>((res, rej) => {
      const tx = d.transaction('kv', 'readwrite')
      tx.objectStore('kv').put(value, key)
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
  } catch { /* storage unavailable: app still works for this session */ }
}
export async function kvClear(): Promise<void> {
  try {
    const d = await db()
    await new Promise<void>((res) => {
      const tx = d.transaction('kv', 'readwrite')
      tx.objectStore('kv').clear()
      tx.oncomplete = () => res()
    })
  } catch { /* ignore */ }
}
