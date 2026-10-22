/**
 * Armazenamento local de salvamentos. IndexedDB no navegador/Android/
 * desktop (WebView); memória para testes e fallback. Sem rede.
 */
import type { WorldState } from '../simulation/state/types';

export interface SaveMeta {
  id: string;
  campaignId: string;
  slot: 'auto' | 'auto-backup' | 'manual';
  label: string;
  savedAtReal: string;
  schemaVersion: number;
  engineVersion: string;
  dataPackVersion: string;
  resumo: { turn: number; data: string; avaliacao: number; nome: string; encerrada: boolean };
}

export interface SaveRecord extends SaveMeta {
  state: WorldState;
}

export interface SaveStore {
  list(): Promise<SaveMeta[]>;
  get(id: string): Promise<SaveRecord | null>;
  put(rec: SaveRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

export class MemoryStore implements SaveStore {
  private m = new Map<string, string>();
  async list() {
    return [...this.m.values()].map((v) => {
      const { state: _s, ...meta } = JSON.parse(v) as SaveRecord;
      return meta;
    });
  }
  async get(id: string) {
    const v = this.m.get(id);
    return v ? (JSON.parse(v) as SaveRecord) : null;
  }
  async put(rec: SaveRecord) {
    this.m.set(rec.id, JSON.stringify(rec));
  }
  async delete(id: string) {
    this.m.delete(id);
  }
}

const DB = 'simulador-governo';
const STORE = 'saves';

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export class IndexedDBStore implements SaveStore {
  private dbp: Promise<IDBDatabase> | null = null;
  constructor(private idb: IDBFactory = globalThis.indexedDB) {}

  private db(): Promise<IDBDatabase> {
    if (!this.dbp) {
      this.dbp = new Promise((res, rej) => {
        const open = this.idb.open(DB, 1);
        open.onupgradeneeded = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
        };
        open.onsuccess = () => res(open.result);
        open.onerror = () => rej(open.error);
      });
    }
    return this.dbp;
  }

  private async tx(mode: IDBTransactionMode) {
    return (await this.db()).transaction(STORE, mode).objectStore(STORE);
  }

  async list(): Promise<SaveMeta[]> {
    const all = (await req((await this.tx('readonly')).getAll())) as SaveRecord[];
    return all.map(({ state: _s, ...meta }) => meta);
  }
  async get(id: string): Promise<SaveRecord | null> {
    return ((await req((await this.tx('readonly')).get(id))) as SaveRecord | undefined) ?? null;
  }
  async put(rec: SaveRecord): Promise<void> {
    const store = await this.tx('readwrite');
    await req(store.put(rec));
    await new Promise<void>((res, rej) => {
      store.transaction.oncomplete = () => res();
      store.transaction.onerror = () => rej(store.transaction.error);
      store.transaction.onabort = () => rej(store.transaction.error ?? new Error('Gravação abortada'));
    });
  }
  async delete(id: string): Promise<void> {
    await req((await this.tx('readwrite')).delete(id));
  }
}
