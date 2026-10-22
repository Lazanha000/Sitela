import { useState } from 'react';
import type { Game } from '../../app/useGame';
import type { IndicatorId } from '../../simulation/state/indicators';
import type { Editoria, NewsItem } from '../../simulation/state/types';
import { INDICATORS, formatIndicator } from '../../simulation/state/indicators';
import { isoLabel, isoToTurn, turnLabel } from '../../simulation/time/calendar';
import { CALENDARIO_2022, COPOM_DATAS } from '../../content/historical-data/pack2022';
import { EDITORIA_LABEL } from '../../systems/media/news';
import { decisionsDue } from '../../systems/events/events';
import { DecisionCard, IndicatorTile, Prov, lastReport } from '../components';

function Story({ n, lead, onWhy }: { n: NewsItem; lead?: boolean; onWhy: (i: IndicatorId) => void }) {
  return (
    <article className={lead ? 'lead' : 'story'}>
      <div className="story-meta">
        <span className="eyebrow">{EDITORIA_LABEL[n.editoria]}</span>
        <Prov p={n.provenance} />
        {n.dataIso && <span>{isoLabel(n.dataIso)}</span>}
        {n.coluna && <span>· {n.coluna}</span>}
      </div>
      {lead ? <h2>{n.titulo}</h2> : <h3>{n.titulo}</h3>}
      {n.linha_fina && <p className="standfirst">{n.linha_fina}</p>}
      {(lead || n.tipo === 'editorial') && n.corpo.length > 0 && (
        <div className={lead ? 'body' : 'stack column-op'} style={lead ? undefined : { gap: 6 }}>
          {n.corpo.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}
      {!lead && n.tipo !== 'editorial' && n.corpo.length > 0 && (
        <details>
          <summary>Ler mais</summary>
          <div className="stack small">
            {n.corpo.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </details>
      )}
      {n.indicadores && n.indicadores.length > 0 && (
        <div className="row xs">
          <span className="muted">Indicadores:</span>
          {n.indicadores.map((i) => (
            <button key={i} className="btn link" onClick={() => onWhy(i)}>
              {INDICATORS[i].label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

export function Capa({ g, onWhy, go }: { g: Game; onWhy: (i: IndicatorId) => void; go: (p: string) => void }) {
  const s = g.state!;
  const [filtro, setFiltro] = useState<Editoria | 'todas'>('todas');
  const edicao = s.news.filter((n) => n.turn === s.turn);
  const noticias = edicao.filter((n) => n.editoria !== 'opiniao' && (filtro === 'todas' || n.editoria === filtro)).sort((a, b) => b.importancia - a.importancia);
  const colunas = edicao.filter((n) => n.editoria === 'opiniao');
  const editorias = [...new Set(edicao.map((n) => n.editoria))].filter((e) => e !== 'opiniao');
  const [lead, ...rest] = noticias;
  const decisoes = decisionsDue(s);
  const rep = lastReport(s);
  const agenda = [
    ...CALENDARIO_2022.filter((c) => isoToTurn(c.dataIso) === s.turn).map((c) => ({ data: c.dataIso, txt: c.titulo })),
    ...Object.entries(COPOM_DATAS)
      .filter(([m]) => Number(m) === s.turn + 1)
      .map(([, d]) => ({ data: d, txt: 'Reunião do Copom (decisão do Banco Central)' })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <>
      {s.status === 'encerrada' && (
        <section className="sheet stack">
          <span className="eyebrow">Campanha encerrada</span>
          <h2>Fim do mandato de 2022</h2>
          <p>
            Resultado: <b>{s.election.resultado === 'reeleito' ? 'reeleição' : s.election.resultado === 'sucessor_eleito' ? 'sucessor eleito' : 'derrota eleitoral'}</b>. Avaliação final: {formatIndicator('aval_positiva', s.ind.aval_positiva)} ótimo/bom. Veja o balanço completo no Arquivo e compare com a história real em Dados e fontes.
          </p>
          <div className="row">
            <button className="btn" onClick={() => go('arquivo')}>
              Abrir o arquivo
            </button>
            <button className="btn" onClick={() => go('salvamentos')}>
              Nova campanha
            </button>
          </div>
        </section>
      )}
      {decisoes.length > 0 && (
        <section className="stack">
          {decisoes.map((d) => (
            <DecisionCard key={d.instanceId} g={g} d={d} />
          ))}
        </section>
      )}
      <div className="front">
        <div className="stack" style={{ gap: 18 }}>
          {editorias.length > 1 && (
            <div className="row" role="group" aria-label="Filtrar por editoria">
              <button className={`btn ${filtro === 'todas' ? 'primary' : ''}`} onClick={() => setFiltro('todas')}>
                Todas
              </button>
              {editorias.map((e) => (
                <button key={e} className={`btn ${filtro === e ? 'primary' : ''}`} onClick={() => setFiltro(e)}>
                  {EDITORIA_LABEL[e]}
                </button>
              ))}
            </div>
          )}
          {lead ? <Story n={lead} lead onWhy={onWhy} /> : <p className="muted">Nenhuma notícia nesta editoria.</p>}
          <div className="stories">
            {rest.slice(0, 12).map((n) => (
              <Story key={n.id} n={n} onWhy={onWhy} />
            ))}
          </div>
          {colunas.length > 0 && (
            <div className="grid cols-2">
              {colunas.map((n) => (
                <Story key={n.id} n={n} onWhy={onWhy} />
              ))}
            </div>
          )}
        </div>
        <aside className="stack" style={{ gap: 16 }}>
          <div className="stack">
            <span className="eyebrow">Painel do mês</span>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {(['aval_positiva', 'ipca_12m', 'selic', 'desemprego', 'teto_folga', 'pc_negociacao'] as IndicatorId[]).map((i) => (
                <IndicatorTile key={i} s={s} ind={i} onWhy={onWhy} spark={false} />
              ))}
            </div>
            <span className="xs muted">Valores do modelo para o fim do mês anterior. Dados oficiais saem com defasagem (ver Economia).</span>
          </div>
          {rep && rep.alertas.length > 0 && (
            <div className="stack">
              <span className="eyebrow">Alertas</span>
              <ul className="warnings">
                {rep.alertas.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="stack">
            <span className="eyebrow">Agenda de {turnLabel(s.turn)}</span>
            {agenda.length === 0 ? (
              <span className="small muted">Sem datas institucionais marcadas.</span>
            ) : (
              <ul className="notes">
                {agenda.map((a) => (
                  <li key={a.data + a.txt}>
                    <b>{isoLabel(a.data)}</b>: {a.txt}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {rep && (
            <button className="btn" onClick={() => g.setRelatorioAberto(true)}>
              Relatório de {turnLabel(rep.turn)}
            </button>
          )}
        </aside>
      </div>
    </>
  );
}
