import type { Game } from '../../app/useGame';
import type { Bill, House, Tactic } from '../../simulation/state/types';
import { turnLabel } from '../../simulation/time/calendar';
import { BLOCS, BLOC_IDS } from '../../content/actors/actors2022';
import { POLICY_BY_ID } from '../../content/policies/policies2022';
import { BILL_TYPE_LABEL, STAGE_LABEL, TACTIC_COST, TACTIC_LABEL, estimateVote, houseOf, isActiveBill, isPlenario, stagesFor } from '../../systems/congress/congress';
import { Meter, Section } from '../components';

function nextHouse(b: Bill): House {
  const h = houseOf(b.stage);
  if (h === 'camara' || h === 'senado') return h;
  return 'camara';
}

function BillCard({ g, b }: { g: Game; b: Bill }) {
  const s = g.state!;
  const def = POLICY_BY_ID[b.policyId];
  const stages = stagesFor(b.type, def.casaInicial ?? 'camara');
  const idx = stages.findIndex((x) => x.stage === b.stage);
  const ativo = isActiveBill(b);
  const est = ativo ? estimateVote(s, b, nextHouse(b)) : null;
  const tatics: Tactic[] = ['dialogo', 'emendas', 'ajustar_texto', 'compromisso_publico', 'urgencia'];
  return (
    <article className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>{def.nome}</h3>
        <span className={`pill ${ativo ? 'neutral' : b.stage === 'aprovado' ? 'good' : 'bad'}`}>{STAGE_LABEL[b.stage]}</span>
      </div>
      <div className="row small muted">
        <span>{BILL_TYPE_LABEL[b.type]}</span>
        <span>· {b.origem === 'historico' ? 'autoria parlamentar, em tramitação desde antes de 2022' : `enviada em ${turnLabel(b.startedTurn)}`}</span>
        {b.type === 'MP' && b.expiresTurn !== undefined && ativo && <span>· perde a validade ao fim de {turnLabel(b.expiresTurn - 1)}</span>}
        {b.urgencia && <span>· urgência constitucional</span>}
      </div>
      <div className="stages" aria-label="Etapas da tramitação">
        {stages.map((st, k) => (
          <span key={st.stage} className={`stage ${ativo && k === idx ? 'now' : k < idx || b.stage === 'aprovado' ? 'done' : ''}`}>
            {STAGE_LABEL[st.stage]}
          </span>
        ))}
      </div>
      {est && (
        <div className="sheet stack small">
          <span className="eyebrow">Contagem do governo — {est.house === 'camara' ? 'Câmara' : 'Senado'} (precisão {est.precisao})</span>
          <span>
            Votos favoráveis esperados: <b className="num">{est.faixa[0].toFixed(0)}–{est.faixa[1].toFixed(0)}</b>. Regra: {est.regra}. Chance estimada de aprovação: <b className="num">{(est.probAprovacao * 100).toFixed(0)}%</b>.
          </span>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bancada</th>
                  <th className="n">Cadeiras</th>
                  <th>Tendência</th>
                  <th>Motivos principais</th>
                </tr>
              </thead>
              <tbody>
                {est.porBancada.map((pb) => (
                  <tr key={pb.bloc}>
                    <td>{BLOCS[pb.bloc].label}</td>
                    <td className="n">{pb.seats}</td>
                    <td>{pb.leitura}</td>
                    <td className="xs">
                      {[...pb.motivos]
                        .sort((a, c) => Math.abs(c.value) - Math.abs(a.value))
                        .slice(0, 3)
                        .map((m) => `${m.label} (${m.value > 0 ? '+' : '−'})`)
                        .join('; ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="xs muted">Em caso de derrota: perda de credibilidade e de confiança dos aliados{b.compromissoPublico ? ', dobrada pelo compromisso público assumido' : ''}. Adiar mantém a agenda ocupada.</span>
        </div>
      )}
      {ativo && b.origem === 'jogador' && (
        <>
          <div className="row">
            {isPlenario(b.stage) && (
              <button className="btn primary" disabled={b.votacaoSolicitada} onClick={() => g.agir({ type: 'pautar', billId: b.id })}>
                {b.votacaoSolicitada ? 'Votação solicitada' : 'Pedir votação neste mês (2)'}
              </button>
            )}
            {b.type !== 'MP' && (
              <button className="btn danger" onClick={() => g.agir({ type: 'retirar', billId: b.id })}>
                Retirar proposta
              </button>
            )}
          </div>
          {b.votacaoSolicitada && <span className="xs muted">A presidência da Casa decide se pauta. A votação ocorre no fechamento do mês.</span>}
          <details>
            <summary>Negociar</summary>
            <div className="options">
              {tatics.map((t) => {
                const usos = b.taticasUsadas.filter((x) => x === t).length;
                return (
                  <div className="option" key={t}>
                    <strong>{TACTIC_LABEL[t].nome}</strong>
                    <span className="small muted">{t === 'ajustar_texto' ? `${TACTIC_LABEL[t].descricao} Ajuste: ${def.ajusteTexto.descricao}` : TACTIC_LABEL[t].descricao}</span>
                    {usos > 0 && <span className="xs">Já usada {usos}×</span>}
                    <button className="btn" onClick={() => g.agir({ type: 'negociar', billId: b.id, tatica: t })}>
                      Aplicar ({TACTIC_COST[t]})
                    </button>
                  </div>
                );
              })}
            </div>
          </details>
        </>
      )}
      {b.origem === 'historico' && ativo && isPlenario(b.stage) && <span className="xs muted">Proposta parlamentar: a pauta depende da presidência da Casa.</span>}
      {b.votos.length > 0 && (
        <div className="small">
          <span className="eyebrow">Votações</span>
          <ul className="notes">
            {b.votos.map((v, k) => (
              <li key={k}>
                {turnLabel(v.turn)} — {v.house === 'camara' ? 'Câmara' : 'Senado'}
                {b.type === 'PEC' ? ` (${v.turno}º turno)` : ''}: {v.sim} sim × {v.nao} não ({v.regra}) — {v.aprovado ? 'aprovada' : 'rejeitada'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export function Congresso({ g }: { g: Game }) {
  const s = g.state!;
  const ativos = s.bills.filter(isActiveBill);
  const encerrados = s.bills.filter((b) => !isActiveBill(b));
  return (
    <>
      <Section title="Composição e relações" aside={<span className="small muted">Bancadas são agregações de partidos (abstração); partidos não votam em bloco perfeito.</span>}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bancada</th>
                <th className="n">Câmara</th>
                <th className="n">Senado</th>
                <th className="n">Relação</th>
                <th className="n">Disciplina</th>
                <th>Perfil</th>
              </tr>
            </thead>
            <tbody>
              {BLOC_IDS.map((b) => (
                <tr key={b}>
                  <td>{BLOCS[b].label}</td>
                  <td className="n">{s.blocs[b].seats.camara}</td>
                  <td className="n">{s.blocs[b].seats.senado}</td>
                  <td className="n">{s.blocs[b].relacao.toFixed(0)}</td>
                  <td className="n">{(s.blocs[b].disciplina * 100).toFixed(0)}%</td>
                  <td className="xs">{BLOCS[b].descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid cols-2">
          <div className="sheet">
            <Meter label="Relação com a presidência da Câmara (pauta)" value={s.presidentes.camara.relacao} />
          </div>
          <div className="sheet">
            <Meter label="Relação com a presidência do Senado (pauta)" value={s.presidentes.senado.relacao} />
          </div>
        </div>
      </Section>
      <Section title="Proposições em tramitação">
        {ativos.length === 0 ? <p className="muted">Nada em tramitação.</p> : <div className="grid cols-2">{ativos.map((b) => <BillCard key={b.id} g={g} b={b} />)}</div>}
      </Section>
      {encerrados.length > 0 && (
        <Section title="Encerradas">
          <div className="grid cols-2">
            {encerrados.map((b) => (
              <BillCard key={b.id} g={g} b={b} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
