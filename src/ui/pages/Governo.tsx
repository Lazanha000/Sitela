import { useState } from 'react';
import type { Game } from '../../app/useGame';
import type { IndicatorId } from '../../simulation/state/indicators';
import type { ActivePolicy, RegionId } from '../../simulation/state/types';
import { turnLabel } from '../../simulation/time/calendar';
import { POLICIES, POLICY_BY_ID, type Instrumento, type PolicyDef } from '../../content/policies/policies2022';
import { ACOES, usosNoMes, type AcaoDef } from '../../content/actions/acoes2022';
import { ORGS, REGIONS, REGION_IDS } from '../../content/actors/actors2022';
import { AGENDA_MAX, agendaEmUso, checkLaunch, policyInCourse } from '../../systems/executive/launch';
import { orgCapacity } from '../../systems/executive/policies';
import { decisionsDue } from '../../systems/events/events';
import { DecisionCard, Meter, Section, fmtBi } from '../components';

const INST_LABEL: Record<Instrumento, string> = { MP: 'Medida provisória', PL: 'Projeto de lei', PLP: 'Projeto de lei complementar', PEC: 'Emenda constitucional (PEC)', decreto: 'Decreto / portaria', ato_gestao: 'Ato de gestão (acionista)' };

const STATUS: Record<ActivePolicy['status'], { label: string; cls: string }> = {
  tramitando: { label: 'Em tramitação', cls: 'neutral' },
  preparacao: { label: 'Em preparação', cls: 'warn' },
  execucao: { label: 'Em execução', cls: 'good' },
  suspensa: { label: 'Suspensa (liminar)', cls: 'bad' },
  encerrada: { label: 'Encerrada', cls: 'neutral' },
  rejeitada: { label: 'Rejeitada', cls: 'bad' },
};

function Ficha({ def }: { def: PolicyDef }) {
  const custoAno = (def.custoMensal + def.renunciaMensal) * 12;
  return (
    <dl className="facts">
      <dt>Objetivo</dt>
      <dd>{def.objetivo}</dd>
      <dt>Problema</dt>
      <dd>{def.problema}</dd>
      <dt>Público</dt>
      <dd>{def.populacaoAlvo}</dd>
      <dt>Órgão</dt>
      <dd>{ORGS[def.orgao].label}</dd>
      <dt>Custo</dt>
      <dd>
        {def.custoMensal > 0 && `${fmtBi(def.custoMensal)}/mês `}
        {def.renunciaMensal > 0 && `renúncia de ${fmtBi(def.renunciaMensal)}/mês `}
        {custoAno === 0 && 'Sem custo orçamentário direto'}
        {custoAno > 0 && `(≈ ${fmtBi(custoAno)} em 12 meses)`}
      </dd>
      <dt>Financiamento</dt>
      <dd>{{ discricionario: 'Remanejamento de despesas discricionárias (dentro do teto)', obrigatoria_teto: 'Despesa obrigatória dentro do teto', excecao_teto: 'Fora do teto, por exceção constitucional (vira dívida)', renuncia: 'Renúncia de receita', nenhum: '—' }[def.financiamento]}</dd>
      <dt>Prazos</dt>
      <dd>
        Preparação de {def.preparacao} {def.preparacao === 1 ? 'mês' : 'meses'}
        {def.fim && `; vigora até ${def.fim}`}
        {def.duracao && `; dura ${def.duracao} meses`}
      </dd>
      <dt>Quem ganha</dt>
      <dd>{def.beneficiados}</dd>
      <dt>Quem paga</dt>
      <dd>{def.prejudicados}</dd>
      <dt>Distribuição</dt>
      <dd>{def.distribuicao}</dd>
      <dt>Efeitos</dt>
      <dd>
        <ul className="notes">
          {def.efeitos.map((e, k) => (
            <li key={k}>{e.nota}</li>
          ))}
          {(def.aoAnunciar ?? []).map((e) => (
            <li key={e.nota}>No anúncio: {e.nota}</li>
          ))}
          {(def.aoAprovar ?? []).map((e) => (
            <li key={e.nota}>Na aprovação: {e.nota}</li>
          ))}
        </ul>
      </dd>
      <dt>Incertezas</dt>
      <dd>{def.incertezas.join(' ')}</dd>
      <dt>Depende de</dt>
      <dd>{def.dependencias.join(' ')}</dd>
      <dt>Risco judicial</dt>
      <dd>{def.riscoJudicial > 0 ? `${def.riscoJudicial >= 0.4 ? 'Alto' : 'Moderado'}: ${def.autorContestacao} — ${def.fundamentoContestacao}` : 'Baixo'}</dd>
      <dt>Evidência</dt>
      <dd>{def.evidencia}</dd>
      <dt>Abstração</dt>
      <dd>{def.abstracao}</dd>
      <dt>Na história</dt>
      <dd>{def.historico}</dd>
    </dl>
  );
}

function PolicyCard({ g, def }: { g: Game; def: PolicyDef }) {
  const s = g.state!;
  const [inst, setInst] = useState<Instrumento>(def.instrumentos[0].tipo);
  const chk = checkLaunch(s, def.id, inst);
  const emCurso = policyInCourse(s, def.id);
  return (
    <article className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>{def.nome}</h3>
        {emCurso && <span className={`pill ${STATUS[emCurso.status].cls}`}>{STATUS[emCurso.status].label}</span>}
      </div>
      <p className="small">{def.resumo}</p>
      <details>
        <summary>Ficha completa</summary>
        <Ficha def={def} />
      </details>
      {!emCurso && !def.inicial && (
        <>
          <label className="field">
            Instrumento jurídico
            <select id={`inst-${def.id}`} value={inst} onChange={(e) => setInst(e.target.value as Instrumento)}>
              {def.instrumentos.map((i) => (
                <option key={i.tipo} value={i.tipo}>
                  {INST_LABEL[i.tipo]}
                </option>
              ))}
            </select>
          </label>
          <span className="xs muted">{def.instrumentos.find((i) => i.tipo === inst)?.descricao}</span>
          {chk.erros.length > 0 && (
            <ul className="errors">
              {chk.erros.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {chk.avisos.length > 0 && (
            <ul className="warnings">
              {chk.avisos.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <div className="row">
            <button className="btn primary" disabled={!chk.ok} onClick={() => g.agir({ type: 'lancar_politica', defId: def.id, instrumento: inst })}>
              Lançar ({chk.custoNegociacao} de negociação)
            </button>
          </div>
        </>
      )}
      {def.inicial && !emCurso && <span className="xs muted">Proposta de autoria parlamentar.</span>}
    </article>
  );
}

function ActivePolicyCard({ g, p }: { g: Game; p: ActivePolicy }) {
  const def = POLICY_BY_ID[p.defId];
  const st = STATUS[p.status];
  return (
    <article className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>{def.nome}</h3>
        <span className={`pill ${st.cls}`}>{st.label}</span>
      </div>
      <div className="row small muted">
        <span>{INST_LABEL[p.instrument as Instrumento]}</span>
        <span>· lançada em {turnLabel(Math.max(0, p.launchedTurn))}</span>
        {p.executionStartTurn !== undefined && p.status === 'preparacao' && <span>· começa em {turnLabel(p.executionStartTurn)}</span>}
      </div>
      {(p.status === 'execucao' || p.status === 'suspensa') && (
        <>
          <Meter label="Execução no último mês (%)" value={p.lastExecution * 100} />
          {p.executionNotes.length > 0 && (
            <ul className="notes">
              {p.executionNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          <span className="small">
            Gasto acumulado: <b className="num">{fmtBi(p.spentTotal)}</b>
            {p.eficacia < 1 && ` · eficácia do texto ${(p.eficacia * 100).toFixed(0)}%`}
          </span>
          {!p.billId && (
            <div>
              <button className="btn danger" onClick={() => g.agir({ type: 'encerrar_politica', policyInstanceId: p.id })}>
                Encerrar política
              </button>
            </div>
          )}
        </>
      )}
      {p.status === 'tramitando' && <span className="small muted">Acompanhe a tramitação na seção Congresso.</span>}
    </article>
  );
}

function AcaoCard({ g, a }: { g: Game; a: AcaoDef }) {
  const s = g.state!;
  const [regiao, setRegiao] = useState<RegionId>('SE');
  const bloq = a.disponivel(s) ?? (usosNoMes(s, a.id) >= a.limiteMensal ? 'Limite mensal atingido.' : null) ?? (s.ind.pc_negociacao < a.custoNegociacao ? 'Capacidade de negociação insuficiente.' : null);
  return (
    <div className="option">
      <strong>{a.nome}</strong>
      <span className="small muted">{a.descricao}</span>
      <ul>
        {a.consequencias.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      {a.precisaRegiao && (
        <select id={`reg-${a.id}`} aria-label="Região" value={regiao} onChange={(e) => setRegiao(e.target.value as RegionId)}>
          {REGION_IDS.map((r) => (
            <option key={r} value={r}>
              {REGIONS[r].label}
            </option>
          ))}
        </select>
      )}
      {bloq && <span className="xs muted">{bloq}</span>}
      <button className="btn" disabled={!!bloq || s.status === 'encerrada'} onClick={() => g.agir({ type: 'acao_politica', acaoId: a.id, regiao: a.precisaRegiao ? regiao : undefined })}>
        Executar{a.custoNegociacao ? ` (${a.custoNegociacao})` : ''}
      </button>
    </div>
  );
}

export function Governo({ g, onWhy }: { g: Game; onWhy: (i: IndicatorId) => void }) {
  const s = g.state!;
  const i = s.ind;
  const ativas = s.policies.filter((p) => !['encerrada', 'rejeitada'].includes(p.status) && !POLICY_BY_ID[p.defId].inicial);
  const historico = s.policies.filter((p) => ['encerrada', 'rejeitada'].includes(p.status));
  const catalogo = POLICIES.filter((p) => !p.inicial && !policyInCourse(s, p.id));
  const capital: [IndicatorId, string][] = [
    ['pc_apoio_social', 'Apoio social'],
    ['pc_confianca_aliados', 'Confiança dos aliados'],
    ['pc_negociacao', 'Capacidade de negociação'],
    ['pc_credibilidade', 'Credibilidade institucional'],
    ['pc_coesao', 'Coesão da coalizão'],
    ['pc_mobilizacao', 'Mobilização da base'],
  ];
  return (
    <>
      {decisionsDue(s).map((d) => (
        <DecisionCard key={d.instanceId} g={g} d={d} />
      ))}
      <Section title="Capital político" aside={<span className="small muted">Seis dimensões; popularidade não é maioria parlamentar.</span>}>
        <div className="grid cols-3">
          {capital.map(([k, l]) => (
            <button key={k} className="sheet" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => onWhy(k)}>
              <Meter label={l} value={i[k]} />
            </button>
          ))}
        </div>
        <div className="grid cols-2">
          <div className="sheet stack">
            <span className="eyebrow">Agenda legislativa</span>
            <span>
              <b className="num">{agendaEmUso(s)}</b> de {AGENDA_MAX} iniciativas em tramitação ou preparação. Agenda cheia bloqueia novas propostas.
            </span>
          </div>
          <div className="sheet stack">
            <span className="eyebrow">Capacidade dos órgãos (0–100)</span>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 6 }}>
              {(Object.keys(ORGS) as (keyof typeof ORGS)[]).map((o) => (
                <Meter key={o} label={ORGS[o].label} value={orgCapacity(s, o)} />
              ))}
            </div>
          </div>
        </div>
      </Section>
      <Section title="Políticas em curso">
        {ativas.length === 0 ? <p className="muted">Nenhuma política do governo em curso. Escolha no catálogo abaixo.</p> : <div className="grid cols-2">{ativas.map((p) => <ActivePolicyCard key={p.id} g={g} p={p} />)}</div>}
        {historico.length > 0 && (
          <details>
            <summary>Encerradas e rejeitadas ({historico.length})</summary>
            <ul className="notes">
              {historico.map((p) => (
                <li key={p.id}>
                  {POLICY_BY_ID[p.defId].nome} — {STATUS[p.status].label}
                  {p.endTurn !== undefined && ` em ${turnLabel(p.endTurn)}`}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>
      <Section title="Catálogo de políticas" aside={<span className="small muted">Antes de lançar: custo, instrumento, prazos, beneficiados e riscos.</span>}>
        <div className="grid cols-2">
          {catalogo.map((d) => (
            <PolicyCard key={d.id} g={g} def={d} />
          ))}
        </div>
      </Section>
      <Section title="Ações políticas do mês">
        {(['comunicacao', 'articulacao', 'instituicoes', 'campanha'] as const).map((cat) => (
          <div key={cat} className="stack">
            <span className="eyebrow">{{ comunicacao: 'Comunicação', articulacao: 'Articulação', instituicoes: 'Instituições', campanha: 'Campanha eleitoral' }[cat]}</span>
            <div className="options">
              {ACOES.filter((a) => a.categoria === cat).map((a) => (
                <AcaoCard key={a.id} g={g} a={a} />
              ))}
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}
