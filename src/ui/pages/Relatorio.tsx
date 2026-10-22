import type { Game } from '../../app/useGame';
import { INDICATORS, formatDelta, formatIndicator, type IndicatorId } from '../../simulation/state/indicators';
import type { TurnReport, WorldState } from '../../simulation/state/types';
import { turnLabel } from '../../simulation/time/calendar';
import { POLICY_BY_ID } from '../../content/policies/policies2022';
import { eventDef } from '../../systems/events/events';
import { KIND_LABEL } from '../components';

/** Indicadores mais relevantes para o resumo, em ordem de prioridade. */
const RESUMO: IndicatorId[] = ['aval_positiva', 'aval_saldo', 'ipca_12m', 'selic', 'desemprego', 'pib_var_12m', 'cambio', 'combustivel', 'primario_ano', 'divida_pib', 'teto_folga', 'pc_credibilidade', 'pc_confianca_aliados', 'pc_negociacao', 'coop_federativa', 'tensao_institucional', 'saude_fila', 'desmatamento_12m'];

const OCORRENCIA_LABEL: Record<string, (d: Record<string, any>) => string> = {
  votacao: (d) => `${d.casa === 'senado' ? 'Senado' : 'Câmara'} ${d.aprovado ? 'aprovou' : 'rejeitou'} ${d.nome} (${d.sim} a ${d.nao})`,
  lei_aprovada: (d) => `Aprovada em definitivo: ${d.nome}`,
  derrota: (d) => `Derrota: ${d.nome}`,
  mp_caducou: (d) => `MP perdeu a validade: ${d.nome}`,
  copom: (d) => `Copom: Selic ${d.anterior.toFixed(2)}% → ${d.nova.toFixed(2)}%`,
  relatorio_bimestral: (d) => (d.acao === 'bloqueio' ? `Bloqueio de R$ ${d.valor.toFixed(1)} bi para cumprir o teto` : 'Relatório bimestral sem bloqueio novo'),
  liminar: (d) => (d.concedida ? `Liminar suspendeu ${d.nome}` : `Liminar negada contra ${d.nome}`),
  contestacao: (d) => `${d.autor} contestou ${d.nome}`,
  decisao_judicial: (d) => `Julgamento: ${d.nome} — ${d.resultado}`,
  politica_inicio: (d) => `Começou a execução: ${d.nome}`,
  politica_fim: (d) => `Terminou: ${d.nome}`,
  pauta_adiada: (d) => `Votação adiada: ${d.nome}`,
  evento: (d) => `Acontecimento: ${eventDef(d.eventId)?.titulo ?? d.eventId}`,
  decisao_evento: (d) => `${d.automatica ? 'Decisão padrão' : 'Decisão'}: ${d.opcao}`,
  eleicao: (d) => `Eleição (${d.round.turno}º turno): governo ${d.round.votosValidos.governo.toFixed(1)}%, oposição ${d.round.votosValidos.oposicao.toFixed(1)}%`,
  paralisacao: () => 'Paralisação de caminhoneiros',
  politica_lancada: (d) => `Lançada: ${d.nome} (${d.instrumento})`,
  reacao_governadores: (d) => `Governadores reagiram a ${d.nome}`,
};

export function ReportBody({ s, r, onWhy }: { s: WorldState; r: TurnReport; onWhy: (i: IndicatorId) => void }) {
  const deltas = RESUMO.map((i) => r.deltas.find((d) => d.ind === i)).filter((d): d is NonNullable<typeof d> => !!d && Math.abs(d.after - d.before) > 1e-3);
  const parciais = r.execucao.filter((e) => e.taxa < 0.95);
  const ocs = r.ocorrencias.filter((o) => OCORRENCIA_LABEL[o.tipo]).sort((a, b) => b.importancia - a.importancia);
  const externos = new Map<string, number>();
  for (const d of r.deltas) for (const c of d.contributions) if (c.kind === 'choque_externo' || c.kind === 'evento') externos.set(c.label, (externos.get(c.label) ?? 0) + 1);
  return (
    <div className="stack" style={{ gap: 18 }}>
      <section className="stack">
        <span className="eyebrow">O que mudou e por quê</span>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th className="n">Antes</th>
                <th className="n">Depois</th>
                <th>Principal causa</th>
              </tr>
            </thead>
            <tbody>
              {deltas.map((d) => {
                const top = d.contributions[0];
                return (
                  <tr key={d.ind}>
                    <td>
                      <button className="btn link" onClick={() => onWhy(d.ind)}>
                        {INDICATORS[d.ind].label}
                      </button>
                    </td>
                    <td className="n">{formatIndicator(d.ind, d.before)}</td>
                    <td className="n">{formatIndicator(d.ind, d.after)}</td>
                    <td className="small">{top ? `${top.label} (${formatDelta(d.ind, top.delta)}; ${KIND_LABEL[top.kind]?.toLowerCase()})` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid cols-2">
        <section className="stack">
          <span className="eyebrow">Acontecimentos e decisões</span>
          <ul className="notes">
            {ocs.slice(0, 14).map((o) => (
              <li key={o.id}>{OCORRENCIA_LABEL[o.tipo](o.dados as Record<string, any>)}</li>
            ))}
          </ul>
        </section>
        <section className="stack">
          <span className="eyebrow">Execução parcial</span>
          {parciais.length === 0 ? (
            <span className="small muted">Todas as políticas em execução rodaram a ≥ 95%.</span>
          ) : (
            parciais.map((e) => (
              <div key={e.policyInstanceId} className="small">
                <b>{POLICY_BY_ID[e.defId].nome}</b>: {(e.taxa * 100).toFixed(0)}%
                <ul className="notes">
                  {e.notas.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
          <span className="eyebrow">Influências de fora do governo</span>
          <span className="small">{externos.size ? [...externos.keys()].slice(0, 6).join('; ') : 'Nenhuma relevante.'}</span>
        </section>
      </div>
      {(r.alertas.length > 0 || r.pendencias.length > 0) && (
        <section className="stack">
          <span className="eyebrow">Riscos e o que exige atenção agora</span>
          <ul className="warnings">
            {r.alertas.map((a) => (
              <li key={a}>{a}</li>
            ))}
            {r.pendencias.map((p) => (
              <li key={p}>Decisão pendente: {eventDef(p)?.titulo ?? p}</li>
            ))}
          </ul>
        </section>
      )}
      <p className="xs muted">Efeitos ainda pendentes (defasados): {s.pendingEffects.length}. Abra “Por quê?” em qualquer indicador para ver a decomposição completa.</p>
    </div>
  );
}

export function RelatorioDrawer({ g, onWhy }: { g: Game; onWhy: (i: IndicatorId) => void }) {
  const s = g.state!;
  const r = s.reports[s.reports.length - 1];
  if (!r) return null;
  const close = () => g.setRelatorioAberto(false);
  return (
    <div className="drawer-bg" onClick={close}>
      <aside className="drawer wide" role="dialog" aria-modal="true" aria-label="Relatório do mês" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow">Relatório pós-turno</span>
          <button className="btn primary" onClick={close}>
            {s.status === 'encerrada' ? 'Fechar' : `Seguir para ${turnLabel(s.turn)}`}
          </button>
        </div>
        <h2 style={{ fontSize: 'var(--s-xl)' }}>Balanço de {turnLabel(r.turn)}</h2>
        <ReportBody s={s} r={r} onWhy={onWhy} />
      </aside>
    </div>
  );
}
