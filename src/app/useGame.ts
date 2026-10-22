/**
 * Ponte entre a interface e o motor. A interface nunca altera o estado
 * diretamente: envia ações ao motor e exibe o estado devolvido.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorldState } from '../simulation/state/types';
import { newCampaign } from '../simulation/engine/newCampaign';
import { advanceTurn } from '../simulation/engine/turn';
import { applyAction, type PlayerAction } from '../simulation/engine/actions';
import { IndexedDBStore, MemoryStore, type SaveMeta, type SaveStore } from '../persistence/store';
import { autosave, importJson, loadSave, manualSave } from '../persistence/saves';

export interface Toast {
  id: number;
  kind: 'ok' | 'erro' | 'info';
  text: string;
}

function makeStore(): { store: SaveStore; persistente: boolean } {
  try {
    if (typeof indexedDB !== 'undefined') return { store: new IndexedDBStore(), persistente: true };
  } catch {
    /* sem IndexedDB */
  }
  return { store: new MemoryStore(), persistente: false };
}

export function useGame() {
  const { store, persistente } = useMemo(makeStore, []);
  const [state, setState] = useState<WorldState | null>(null);
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [relatorioAberto, setRelatorioAberto] = useState(false);
  const seq = useRef(0);

  const toast = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'erro' ? 7000 : 4000);
  }, []);

  const refreshSaves = useCallback(async () => {
    try {
      const l = await store.list();
      l.sort((a, b) => b.savedAtReal.localeCompare(a.savedAtReal));
      setSaves(l);
      return l;
    } catch (e) {
      toast('erro', `Não foi possível ler os salvamentos: ${(e as Error).message}`);
      return [];
    }
  }, [store, toast]);

  useEffect(() => {
    void (async () => {
      const l = await refreshSaves();
      const auto = l.find((m) => m.slot === 'auto' && !m.resumo.encerrada);
      if (auto) {
        const r = await loadSave(store, auto.id);
        if (r.state) {
          setState(r.state);
          if (r.erros.length) toast('info', r.erros[0]);
        }
      }
      setCarregando(false);
    })();
  }, [refreshSaves, store, toast]);

  const persist = useCallback(
    async (s: WorldState) => {
      try {
        await autosave(store, s, new Date().toISOString());
        await refreshSaves();
      } catch (e) {
        toast('erro', `Falha ao gravar o salvamento automático (o jogo continua aberto): ${(e as Error).message}`);
      }
    },
    [store, refreshSaves, toast],
  );

  const iniciar = useCallback(
    async (opts: { seed: string; name: string; difficulty: 'normal' | 'dificil' }) => {
      const s = newCampaign({ ...opts, campaignId: `camp-${Date.now().toString(36)}`, createdAtReal: new Date().toISOString() });
      setState(s);
      await persist(s);
      toast('ok', 'Nova campanha iniciada em 1º de janeiro de 2022.');
    },
    [persist, toast],
  );

  const agir = useCallback(
    (a: PlayerAction): boolean => {
      if (!state) return false;
      const r = applyAction(state, a);
      if (r.erro) {
        toast('erro', r.erro);
        return false;
      }
      setState(r.state);
      if (r.mensagem) toast('ok', r.mensagem);
      return true;
    },
    [state, toast],
  );

  const avancar = useCallback(async () => {
    if (!state) return;
    const s = advanceTurn(state);
    setState(s);
    setRelatorioAberto(true);
    await persist(s);
  }, [state, persist]);

  const salvarManual = useCallback(
    async (label: string) => {
      if (!state) return;
      try {
        await manualSave(store, state, label, new Date().toISOString());
        await refreshSaves();
        toast('ok', 'Campanha salva.');
      } catch (e) {
        toast('erro', `Falha ao salvar: ${(e as Error).message}`);
      }
    },
    [state, store, refreshSaves, toast],
  );

  const carregar = useCallback(
    async (id: string) => {
      const r = await loadSave(store, id);
      if (!r.state) {
        toast('erro', `Não foi possível carregar: ${r.erros.join('; ')}`);
        return;
      }
      setState(r.state);
      toast(r.erros.length ? 'info' : 'ok', r.erros[0] ?? 'Campanha carregada.');
    },
    [store, toast],
  );

  const excluir = useCallback(
    async (id: string) => {
      try {
        await store.delete(id);
        await refreshSaves();
        toast('ok', 'Salvamento excluído.');
      } catch (e) {
        toast('erro', `Falha ao excluir: ${(e as Error).message}`);
      }
    },
    [store, refreshSaves, toast],
  );

  const importar = useCallback(
    async (texto: string) => {
      const r = importJson(texto);
      if (!r.state) {
        toast('erro', `Arquivo rejeitado: ${r.erros.slice(0, 3).join('; ')}`);
        return;
      }
      setState(r.state);
      await persist(r.state);
      toast('ok', 'Campanha importada.');
    },
    [persist, toast],
  );

  const fechar = useCallback(() => setState(null), []);

  return { state, saves, toasts, carregando, persistente, relatorioAberto, setRelatorioAberto, iniciar, agir, avancar, salvarManual, carregar, excluir, importar, fechar };
}

export type Game = ReturnType<typeof useGame>;
