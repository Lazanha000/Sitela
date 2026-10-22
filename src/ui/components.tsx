import { useState, type ReactNode } from 'react';
import type { Game } from '../app/useGame';
import { INDICATORS, formatDelta, formatIndicator, type IndicatorId } from '../simulation/state/indicators';
import type { PendingDecision, Provenance, TurnReport, WorldState } from '../simulation/state/types';
import { SERIE_OFFSET } from '../simulation/engine/context';
import { shortLabel, turnLabel, turnToDate } from '../simulation/time/calendar';
import { eventDef } from '../systems/events/events';

export const PROV_LABEL: Record<Provenance, string> = {
  fato: 'Fato histórico',
  observado: 'Dado observado',
  estimativa: 'Estimativa',
  abstracao: 'Abstração de jogo',
  contrafactual: 'Simulado',
  projecao: 'Projeção',
};

export function Prov({ p }: { p: Provenance }) {
  return <span className={`badge prov-${p}`} title={PROV_LABEL[p]}>{PROV_LABEL[p]}</span>;
}

export const KIND_LABEL: Record<string, string> = {
  politica: 'Decisão do governo',
  acao: 'Ação do governo',
  evento: 'Acontecimento',
  choque_externo: 'Choque externo',
  ator: 'Reação de atores',
  instituicao: 'Instituição autônoma',
  dinamica: 'Dinâmica do sistema',
  ruido: 'Incerteza (aleatório)',
};

export function lastReport(s: WorldState): TurnReport | undefined {
  return s.reports[s.reports.length - 1];
}

export function deltaOf(s: WorldState, ind: IndicatorId): number | null {
  const r = lastReport(s);
  const d = r?.deltas.find((x) => x.ind === ind);
  return d ? d.after - d.before : null;
}

export function DeltaText({ ind, delta }: { ind: IndicatorId; delta: number | null }) {
  if (delta === null || Math.abs(delta) < 1e-6) return <span className="muted">estável</span>;
  const dir = INDICATORS[ind].direcao;
  const cls = dir === 'neutral' ? 'muted' : (delta > 0) === (dir === 'up') ? 'up-good' : 'up-bad';
  return <span className={`num ${cls}`}>{formatDelta(ind, delta)}</span>;
}

export function Sparkline({ s, ind }: { s: WorldState; ind: IndicatorId }) {
  const raw = [...(s.serie[ind] ?? [])];
  raw[s.turn + SERIE_OFFSET] = s.ind[ind];
  const pts = raw.map((v, i) => ({ i, v })).filter((p): p is { i: number; v: number } => typeof p.v === 'number');
  if (pts.length < 2) return null;
  const i0 = pts[0].i;
  const n = Math.max(raw.length - 1 - i0, 1);
  const vals = pts.map((p) => p.v);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < 1e-9) {
    hi += 1;
    lo -= 1;
  }
  const x = (i: number) => ((i - i0) / n) * 100;
  const y = (v: number) => 31 - ((v - lo) / (hi - lo)) * 28;
  const line = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(2)},${y(p.v).toFixed(2)}`).join(' ');
  const area = `${line} L${x(pts[pts.length - 1].i).toFixed(2)},34 L${x(pts[0].i).toFixed(2)},34 Z`;
  const last = pts[pts.length - 1];
  const sep = x(SERIE_OFFSET - 0.5);
  return (
    <svg className="spark" viewBox="0 0 100 34" preserveAspectRatio="none" role="img" aria-label={`Evolução de ${INDICATORS[ind].label}`}>
      {sep > 0 && sep < 100 && <line x1={sep} x2={sep} y1="0" y2="34" stroke="var(--rule)" strokeDasharray="1.5 1.5" vectorEffect="non-scaling-stroke" />}
      <path d={area} fill="var(--accent-soft)" stroke="none" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last.i)} cy={y(last.v)} r="1.8" fill="var(--accent)" />
    </svg>
  );
}

export function IndicatorTile({ s, ind, onWhy, spark = true }: { s: WorldState; ind: IndicatorId; onWhy: (i: IndicatorId) => void; spark?: boolean }) {
  const d = INDICATORS[ind];
  return (
    <div className="ind">
      <span className="label">{d.label}</span>
      <span className="value">{formatIndicator(ind, s.ind[ind])}</span>
      {spark && <Sparkline s={s} ind={ind} />}
      <span className="meta">
        <DeltaText ind={ind} delta={deltaOf(s, ind)} />
        <button className="why" onClick={() => onWhy(ind)} aria-label={`Por que mudou: ${d.label}`}>
          Por quê?
        </button>
      </span>
    </div>
  );
}

export function IndicatorRows({ s, inds, onWhy }: { s: WorldState; inds: IndicatorId[]; onWhy: (i: IndicatorId) => void }) {
  return (
    <div className="ind-list">
      {inds.map((ind) => (
        <div className="ind-row" key={ind}>
          <button onClick={() => onWhy(ind)} title="Ver por que mudou">
            {INDICATORS[ind].label}
          </button>
          <span className="v">{formatIndicator(ind, s.ind[ind])}</span>
          <span className="small" style={{ minWidth: 70, textAlign: 'right' }}>
            <DeltaText ind={ind} delta={deltaOf(s, ind)} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function Meter({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="meter" title={hint}>
      <span>{label}</span>
      <span className="num" style={{ textAlign: 'right' }}>
        {value.toFixed(0)}
      </span>
      <div className="bar">
        <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

/** Painel "Por que mudou?" — decomposição causal do último mês. */
export function CausalDrawer({ s, ind, onClose }: { s: WorldState; ind: IndicatorId; onClose: () => void }) {
  const def = INDICATORS[ind];
  const r = lastReport(s);
  const d = r?.deltas.find((x) => x.ind === ind);
  const contribs = (d?.contributions ?? []).filter((c) => Math.abs(c.delta) > 1e-4);
  const max = Math.max(1e-9, ...contribs.map((c) => Math.abs(c.delta)));
  const governo = contribs.filter((c) => c.controlavel).reduce((a, c) => a + c.delta, 0);
  const fora = contribs.filter((c) => !c.controlavel).reduce((a, c) => a + c.delta, 0);
  const pendentes = s.pendingEffects.filter((e) => e.target.kind === 'indicator' && e.target.ind === ind);
  const fluxo = def.natureza === 'fluxo' && ['ipca_mes', 'receita_mes', 'despesa_mes', 'primario_mes', 'juros_mes'].includes(ind);
  return (
    <div className="drawer-bg" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Por que mudou: ${def.label}`} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow">Por que mudou?</span>
          <button className="btn" onClick={onClose}>
            Fechar
          </button>
        </div>
        <h2 style={{ fontSize: 'var(--s-xl)' }}>{def.label}</h2>
        <p className="small muted">{def.descricao}</p>
        <div className="row small">
          <span className="badge prov-abstracao">{def.natureza}</span>
          {def.abstracao && <Prov p="abstracao" />}
          {def.divulgacao && (
            <span className="muted">
              Divulgação oficial com {def.divulgacao.defasagem} {def.divulgacao.defasagem === 1 ? 'mês' : 'meses'} de defasagem ({def.divulgacao.fonte}).
            </span>
          )}
        </div>
        <Sparkline s={s} ind={ind} />
        {!r ? (
          <p className="muted">Ainda não há meses fechados. Encerre o mês para ver a decomposição causal.</p>
        ) : !d ? (
          <p>
            Sem variação em {turnLabel(r.turn)}: <b className="num">{formatIndicator(ind, s.ind[ind])}</b>.
          </p>
        ) : (
          <>
            <p>
              Em <b>{turnLabel(r.turn)}</b>: de <b className="num">{formatIndicator(ind, d.before)}</b> para <b className="num">{formatIndicator(ind, d.after)}</b> ({<DeltaText ind={ind} delta={d.after - d.before} />}).
            </p>
            {fluxo && <p className="small muted">Este indicador é um fluxo mensal: as contribuições abaixo mostram a composição do mês, e a linha “substitui o valor do mês anterior” remove o mês passado.</p>}
            <div className="grid cols-2 small">
              <div className="sheet">
                <span className="eyebrow">O governo controlava</span>
                <div className="num">{formatDelta(ind, governo)}</div>
              </div>
              <div className="sheet">
                <span className="eyebrow">Veio de fora ou do sistema</span>
                <div className="num">{formatDelta(ind, fora)}</div>
              </div>
            </div>
            <div>
              {contribs.map((c) => (
                <div className="contrib" key={c.causeId}>
                  <span>
                    {c.label}
                    <br />
                    <span className="kind">{KIND_LABEL[c.kind] ?? c.kind}</span>
                  </span>
                  <span className="barcell" aria-hidden="true">
                    <span className={c.delta >= 0 ? 'pos' : 'neg'} style={{ width: `${(Math.abs(c.delta) / max) * 50}%` }} />
                  </span>
                  <span className="num" style={{ textAlign: 'right' }}>
                    {formatDelta(ind, c.delta)}
                  </span>
                </div>
              ))}
            </div>
            <p className="xs muted">A soma das contribuições reconcilia exatamente a variação. Coeficientes são abstrações de jogo documentadas, não previsões econométricas.</p>
          </>
        )}
        {pendentes.length > 0 && (
          <div className="stack">
            <span className="eyebrow">Efeitos já contratados para os próximos meses</span>
            <ul className="notes">
              {pendentes.map((e) => (
                <li key={e.id}>
                  {shortLabel(turnToDate(e.dueTurn))}: {e.causeLabel} ({formatDelta(ind, e.delta)})
                </li>
              ))}
            </ul>
          </div>
        )}
        {ind === 'ipca_mes' && s.econ.ipcaComposicao.length > 0 && (
          <div className="stack">
            <span className="eyebrow">Composição do IPCA do último mês</span>
            <ul className="notes">
              {s.econ.ipcaComposicao.map((c) => (
                <li key={c.label}>
                  {c.label}: <span className="num">{c.value.toFixed(2)} p.p.</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

export function ConfirmButton({ label, confirmLabel, onConfirm, className = 'btn', disabled }: { label: string; confirmLabel: string; onConfirm: () => void; className?: string; disabled?: boolean }) {
  const [armed, setArmed] = useState(false);
  if (!armed)
    return (
      <button className={className} disabled={disabled} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  return (
    <span className="row">
      <button
        className="btn danger"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button className="btn" onClick={() => setArmed(false)}>
        Cancelar
      </button>
    </span>
  );
}

export function DecisionCard({ g, d }: { g: Game; d: PendingDecision }) {
  const s = g.state!;
  const def = eventDef(d.eventId);
  if (!def) return null;
  return (
    <section className="decision" aria-label={`Decisão: ${def.titulo}`}>
      <div className="row">
        <span className="eyebrow">Decisão pendente</span>
        <Prov p={def.provenance} />
        {def.dataIso && <span className="xs muted">{def.dataIso.split('-').reverse().join('/')}</span>}
      </div>
      <h3>{def.titulo}</h3>
      <p className="small">{def.descricao(s, d)}</p>
      <div className="options">
        {def.opcoes!.map((o) => {
          const bloqueio = o.disponivel?.(s, d) ?? null;
          return (
            <div className="option" key={o.id}>
              <strong>{o.label}</strong>
              <span className="small muted">{o.descricao}</span>
              <ul>
                {o.consequencias.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              {bloqueio && <span className="xs" style={{ color: 'var(--bad)' }}>{bloqueio}</span>}
              <button className="btn primary" disabled={!!bloqueio} onClick={() => g.agir({ type: 'decidir_evento', instanceId: d.instanceId, optionId: o.id })}>
                Escolher
              </button>
              {def.padrao === o.id && <span className="xs muted">Opção aplicada se você não decidir neste mês.</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="stack" style={{ gap: 14 }}>
      <div className="section-head">
        <h2>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function fmtBi(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} bi`;
}
