import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { newCampaign } from '../simulation/engine/newCampaign';
import { advanceTurn } from '../simulation/engine/turn';
import { IndexedDBStore, MemoryStore } from '../persistence/store';
import { autosave, exportJson, importJson, loadSave, manualSave } from '../persistence/saves';
import { migrate } from '../migrations';
import { validateState } from '../persistence/validate';

describe('salvamento (spec §22)', () => {
  it('salvar e carregar preserva o estado (memória)', async () => {
    const store = new MemoryStore();
    const s = advanceTurn(advanceTurn(newCampaign({ seed: 'save' })));
    const id = await manualSave(store, s, 'teste', '2026-01-01T00:00:00Z');
    const r = await loadSave(store, id);
    expect(r.erros).toEqual([]);
    expect(JSON.stringify(r.state)).toEqual(JSON.stringify(s));
  });

  it('salvar e carregar preserva o estado (IndexedDB)', async () => {
    const store = new IndexedDBStore();
    const s = advanceTurn(newCampaign({ seed: 'idb' }));
    await autosave(store, s, '2026-01-01T00:00:00Z');
    const lista = await store.list();
    expect(lista.some((m) => m.slot === 'auto' && m.resumo.turn === 1)).toBe(true);
    const r = await loadSave(store, `${s.meta.campaignId}:auto`);
    expect(JSON.stringify(r.state)).toEqual(JSON.stringify(s));
    // continuar a partir do carregado dá o mesmo resultado que continuar do original
    expect(JSON.stringify(advanceTurn(r.state!))).toEqual(JSON.stringify(advanceTurn(s)));
  });

  it('autosave mantém cópia de segurança e a usa se o principal estiver corrompido', async () => {
    const store = new MemoryStore();
    const s0 = newCampaign({ seed: 'backup' });
    const s1 = advanceTurn(s0);
    await autosave(store, s0, 't0');
    await autosave(store, s1, 't1');
    const auto = (await store.get(`${s0.meta.campaignId}:auto`))!;
    await store.put({ ...auto, state: { ...auto.state, ind: undefined } as never });
    const r = await loadSave(store, `${s0.meta.campaignId}:auto`);
    expect(r.state?.turn).toBe(0);
    expect(r.erros[0]).toMatch(/cópia de segurança/);
  });

  it('exportar/importar JSON preserva o estado e rejeita arquivos inválidos', () => {
    const s = advanceTurn(newCampaign({ seed: 'json' }));
    const r = importJson(exportJson(s));
    expect(JSON.stringify(r.state)).toEqual(JSON.stringify(s));
    expect(importJson('{"x":1}').erros.length).toBeGreaterThan(0);
    expect(importJson('não é json').erros.length).toBeGreaterThan(0);
  });

  it('validação detecta indicadores ausentes', () => {
    const s = newCampaign({ seed: 'val' }) as any;
    delete s.ind.selic;
    expect(validateState(s).some((e) => e.includes('selic'))).toBe(true);
  });

  it('migração percorre os esquemas sem descartar campos essenciais', () => {
    const s = newCampaign({ seed: 'mig' }) as any;
    s.meta.schemaVersion = 0;
    delete s.orgs;
    const table = { 0: (raw: any) => ({ ...raw, orgs: { economia: 0, cidadania: 0, saude: 0, infraestrutura: 0, meio_ambiente: 0, minas_energia: 0, gestao: 0 } }) };
    const m = migrate(s, table, 1);
    expect(m.meta.schemaVersion).toBe(1);
    expect(m.orgs).toBeDefined();
    expect(m.ind.selic).toBe(9.25);
    expect(m.migrations).toContain('esquema 0 → 1');
    expect(() => migrate({ meta: { schemaVersion: 99 } }, table, 1)).toThrow(/mais nova/);
  });
});
