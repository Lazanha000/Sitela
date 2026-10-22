/**
 * Regras de salvamento: autosave em ponto seguro (após cada turno) com
 * cópia de segurança do autosave anterior; salvamentos manuais; carga com
 * migração + validação; exportação/importação JSON.
 */
import type { WorldState } from '../simulation/state/types';
import { turnLabel } from '../simulation/time/calendar';
import { migrate } from '../migrations';
import { validateState } from './validate';
import type { SaveMeta, SaveRecord, SaveStore } from './store';

function meta(state: WorldState, id: string, slot: SaveMeta['slot'], label: string, nowIso: string): SaveMeta {
  return {
    id,
    campaignId: state.meta.campaignId,
    slot,
    label,
    savedAtReal: nowIso,
    schemaVersion: state.meta.schemaVersion,
    engineVersion: state.meta.engineVersion,
    dataPackVersion: state.meta.dataPackVersion,
    resumo: { turn: state.turn, data: turnLabel(Math.min(state.turn, 12)), avaliacao: state.ind.aval_positiva, nome: state.meta.name, encerrada: state.status === 'encerrada' },
  };
}

export async function autosave(store: SaveStore, state: WorldState, nowIso: string): Promise<void> {
  const id = `${state.meta.campaignId}:auto`;
  const prev = await store.get(id);
  if (prev) await store.put({ ...prev, id: `${state.meta.campaignId}:auto-backup`, slot: 'auto-backup', label: 'Cópia de segurança (autosave anterior)' });
  await store.put({ ...meta(state, id, 'auto', 'Salvamento automático', nowIso), state });
}

export async function manualSave(store: SaveStore, state: WorldState, label: string, nowIso: string): Promise<string> {
  const id = `${state.meta.campaignId}:manual:${nowIso}`;
  await store.put({ ...meta(state, id, 'manual', label || 'Salvamento manual', nowIso), state });
  return id;
}

export function parseState(raw: unknown): { state?: WorldState; erros: string[] } {
  try {
    const migrated = migrate(raw as Record<string, any>);
    const erros = validateState(migrated);
    return erros.length ? { erros } : { state: migrated as WorldState, erros: [] };
  } catch (e) {
    return { erros: [(e as Error).message] };
  }
}

export async function loadSave(store: SaveStore, id: string): Promise<{ state?: WorldState; erros: string[] }> {
  const rec = await store.get(id);
  if (!rec) return { erros: ['Salvamento não encontrado.'] };
  const r = parseState(rec.state);
  if (r.erros.length && rec.slot === 'auto') {
    const backup = await store.get(`${rec.campaignId}:auto-backup`);
    if (backup) {
      const b = parseState(backup.state);
      if (b.state) return { state: b.state, erros: ['O salvamento automático estava corrompido; carregada a cópia de segurança.'] };
    }
  }
  return r;
}

export function exportJson(state: WorldState): string {
  return JSON.stringify({ formato: 'simulador-governo-save', state });
}

export function importJson(text: string): { state?: WorldState; erros: string[] } {
  try {
    const obj = JSON.parse(text);
    return parseState(obj?.state ?? obj);
  } catch {
    return { erros: ['Arquivo JSON inválido.'] };
  }
}

export type { SaveRecord };
