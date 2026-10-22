import { useEffect, useState } from 'react';
import { useGame } from './useGame';
import type { IndicatorId } from '../simulation/state/indicators';
import { MESES, turnLabel, turnToDate } from '../simulation/time/calendar';
import { GAME_STAGE, GAME_VERSION } from '../simulation/version';
import { JORNAL } from '../systems/media/news';
import { decisionsDue } from '../systems/events/events';
import { CausalDrawer } from '../ui/components';
import { Capa } from '../ui/pages/Capa';
import { Governo } from '../ui/pages/Governo';
import { Economia } from '../ui/pages/Economia';
import { Congresso } from '../ui/pages/Congresso';
import { Eleicoes, Estados, Instituicoes } from '../ui/pages/Paineis';
import { Arquivo, Dados } from '../ui/pages/Arquivo';
import { Boas, Salvamentos } from '../ui/pages/Salvamentos';
import { RelatorioDrawer } from '../ui/pages/Relatorio';

const PAGES = [
  ['capa', 'Primeira página'],
  ['governo', 'Governo e agenda'],
  ['economia', 'Economia e orçamento'],
  ['congresso', 'Congresso'],
  ['instituicoes', 'Instituições'],
  ['estados', 'Estados'],
  ['eleicoes', 'Opinião e eleições'],
  ['arquivo', 'Arquivo'],
  ['dados', 'Dados e fontes'],
  ['salvamentos', 'Salvamentos'],
] as const;
type Page = (typeof PAGES)[number][0];

function readHash(): Page {
  const h = (typeof location !== 'undefined' ? location.hash.slice(1) : '') as Page;
  return PAGES.some(([p]) => p === h) ? h : 'capa';
}

const WEEKDAY_FIRST = ['sábado', 'terça-feira', 'terça-feira', 'sexta-feira', 'domingo', 'quarta-feira', 'sexta-feira', 'segunda-feira', 'quinta-feira', 'sábado', 'terça-feira', 'quinta-feira'];

export function App() {
  const g = useGame();
  const [page, setPage] = useState<Page>(readHash);
  const [why, setWhy] = useState<IndicatorId | null>(null);

  useEffect(() => {
    const on = () => setPage(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    document.title = g.state ? `${JORNAL} · ${turnLabel(Math.min(g.state.turn, 12))}` : 'Simulador do Governo';
  }, [g.state]);

  const go = (p: string) => {
    location.hash = p;
    setPage(p as Page);
    window.scrollTo({ top: 0 });
  };

  const s = g.state;
  const d = s ? turnToDate(s.turn) : null;
  const pend = s ? decisionsDue(s).length : 0;
  const [armado, setArmado] = useState(false);
  useEffect(() => setArmado(false), [s?.turn]);

  const encerrar = () => {
    if (pend > 0 && !armado) {
      setArmado(true);
      return;
    }
    setArmado(false);
    void g.avancar();
  };

  return (
    <>
      <header className="masthead">
        <div className="wrap">
          <div className="brand">
            <h1>{JORNAL}</h1>
            <span className="dateline">
              {s && d ? (
                <>
                  Brasília, {s.turn < 12 ? WEEKDAY_FIRST[d.month - 1] + ', ' : 'domingo, '}
                  <b>
                    1º de {MESES[d.month - 1]} de {d.year}
                  </b>{' '}
                  · Edição nº {s.turn + 1} · {s.meta.name}
                </>
              ) : (
                'Simulador do Governo Brasileiro'
              )}
            </span>
          </div>
          <div className="turnbar">
            <span className="version">
              v{GAME_VERSION} {GAME_STAGE}
            </span>
            {s && s.status !== 'encerrada' && (
              <>
                {armado && <span className="small" style={{ color: 'var(--warn)' }}>{pend} decisão(ões) sem resposta receberão a opção padrão.</span>}
                <button className="btn primary big" onClick={encerrar}>
                  {armado ? 'Confirmar e encerrar' : `Encerrar ${MESES[d!.month - 1]}`}
                </button>
                {armado && (
                  <button className="btn" onClick={() => setArmado(false)}>
                    Voltar
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>
      {s && (
        <nav className="navbar" aria-label="Seções">
          <div className="wrap">
            {PAGES.map(([p, label]) => (
              <a key={p} href={`#${p}`} aria-current={page === p ? 'page' : undefined} onClick={(e) => { e.preventDefault(); go(p); }}>
                {label}
                {(p === 'capa' || p === 'governo') && pend > 0 && <span className="badge prov-estimativa">{pend}</span>}
              </a>
            ))}
          </div>
        </nav>
      )}
      <main className="wrap">
        {g.carregando ? (
          <p className="muted">Abrindo a redação…</p>
        ) : !s ? (
          <Boas g={g} />
        ) : page === 'capa' ? (
          <Capa g={g} onWhy={setWhy} go={go} />
        ) : page === 'governo' ? (
          <Governo g={g} onWhy={setWhy} />
        ) : page === 'economia' ? (
          <Economia g={g} onWhy={setWhy} />
        ) : page === 'congresso' ? (
          <Congresso g={g} />
        ) : page === 'instituicoes' ? (
          <Instituicoes g={g} onWhy={setWhy} />
        ) : page === 'estados' ? (
          <Estados g={g} onWhy={setWhy} />
        ) : page === 'eleicoes' ? (
          <Eleicoes g={g} onWhy={setWhy} />
        ) : page === 'arquivo' ? (
          <Arquivo g={g} onWhy={setWhy} />
        ) : page === 'dados' ? (
          <Dados g={g} />
        ) : (
          <Salvamentos g={g} />
        )}
      </main>
      {s && why && <CausalDrawer s={s} ind={why} onClose={() => setWhy(null)} />}
      {s && g.relatorioAberto && !why && <RelatorioDrawer g={g} onWhy={setWhy} />}
      <div className="toasts" aria-live="polite">
        {g.toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
