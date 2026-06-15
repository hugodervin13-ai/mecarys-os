// MECARYS OS — Wrapper IndexedDB minimal (promesses).
// Deux object stores :
//   'nodes' — métadonnées de l'arbre documentaire (dossiers + fichiers), keyPath 'id'
//   'blobs' — binaires bruts des fichiers, indexés par id de node
//
// IndexedDB (et non localStorage) est utilisé pour le stockage des fichiers car
// son quota est large (centaines de Mo) et il accepte les Blob nativement —
// les fichiers et leurs aperçus persistent donc entre les rechargements.

const DB_NAME = 'mecarys_docs'
const DB_VERSION = 1
let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('nodes')) db.createObjectStore('nodes', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function run(store, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const req = fn(tx.objectStore(store))
    let result
    if (req) req.onsuccess = () => { result = req.result }
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  }))
}

export const idb = {
  getAll: (store) => run(store, 'readonly', os => os.getAll()),
  get: (store, key) => run(store, 'readonly', os => os.get(key)),
  put: (store, value, key) => run(store, 'readwrite', os => os.put(value, key)),
  delete: (store, key) => run(store, 'readwrite', os => os.delete(key)),
}
