import type { Game } from '../../app/useGame';
import { formatIndicator, type IndicatorId } from '../../simulation/state/indicators';
import type { GroupId } from '../../simulation/state/types';
import { shortLabel, turnLabel, turnToDate } from '../../simulation/time/calendar';
import { FACTOR_LABELS, GROUPS, GROUP_IDS, REGIONS, REGION_IDS } from '../../content/actors/actors2022';
import { POLICY_BY_ID } from '../../content/policies/policies2022';
import { HISTORIA_REAL_2022 } from '../../content/historical-data/pack2022';
import { groupOpinion, regionalOpinion } from '../../systems/opinion/opinion';
import { CAND_IDS, candidateLabel, comparecimento, intencaoNacional } from '../../systems/elections/elections';
import { IndicatorTile, Meter, Section } from '../components';

export function Instituicoes({ g, onWhy }: { g: Game; onWhy: (i: IndicatorId) => void }) {
  const s = g.state!;
  return (
    <>
      <Section title="Relações entre Poderes">
        <div className="grid cols-4">
          {(['tensao_institucional', 'relacao_stf', 'confianca_eleitoral', 'pc_credibilidade'] as IndicatorId[]).map((i) => (
            <IndicatorTile key={i} s={s} ind={i} onWhy={onWhy} />
          ))}
        </div>
        <div className="grid cols-3">
          <div className="sheet stack small">
            <span className="eyebrow">Supremo Tribunal Federal</span>
            <p>Decide com base em competência, fundamentos e procedimento. O clima institucional influencia pouco; a fragilidade jurídica da medida, muito. Uma liminar suspende a execução até o julgamento.</p>
          </div>
          <div className="sheet stack small">
            <span className="eyebrow">Banco Central</span>
            <p>Autônomo desde a LC 179/2021, com mandatos fixos. O Copom decide a Selic por regra própria (expectativas, meta, atividade). Pressão pública não muda a decisão, mas pode piorar expectativas.</p>
          </div>
          <div className="sheet stack small">
            <span className="eyebrow">TCU e Justiça Eleitoral</span>
            <p>O TCU julga atos como a capitalização da Eletrobras. A Justiça Eleitoral aplica as condutas vedadas do art. 73 da Lei 9.504/97, que limitam o Executivo a partir de julho.</p>
          </div>
        </div>
      </Section>
      <Section title="Ações judiciais contra medidas do governo">
        {s.challenges.length === 0 ? (
          <p className="muted">Nenhuma medida do governo foi contestada até agora.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Medida</th>
                  <th>Autor</th>
                  <th>Fundamento</th>
                  <th>Situação</th>
                  <th>Desde</th>
                </tr>
              </thead>
              <tbody>
                {s.challenges.map((c) => {
                  const p = s.policies.find((x) => x.id === c.policyInstanceId);
                  return (
                    <tr key={c.id}>
                      <td>{p ? POLICY_BY_ID[p.defId].nome : '—'}</td>
                      <td>{c.autor}</td>
                      <td className="xs">{c.fundamento}</td>
                      <td>
                        {{ ajuizada: 'Aguardando liminar', liminar_concedida: 'Suspensa por liminar', liminar_negada: 'Liminar negada; mérito pendente', decidida: `Julgada: ${c.resultado}` }[c.stage]}
                        {c.descumprida && <span className="pill bad"> descumprida</span>}
                      </td>
                      <td>{shortLabel(turnToDate(c.filedTurn))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}

export function Estados({ g, onWhy }: { g: Game; onWhy: (i: IndicatorId) => void }) {
  const s = g.state!;
  const reg = regionalOpinion(s);
  return (
    <>
      <Section title="Regiões e governadores" aside={<span className="small muted">Agregado por região nesta versão; mapa por estado previsto para a v0.2.</span>}>
        <div className="grid cols-4">
          <IndicatorTile s={s} ind="coop_federativa" onWhy={onWhy} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Região</th>
                <th className="n">População</th>
                <th className="n">Ótimo/bom</th>
                <th className="n">Ruim/péssimo</th>
                <th className="n">Saldo</th>
                <th className="n">Cooperação</th>
                <th className="n">Alinhamento</th>
                <th className="n">Necessidade fiscal</th>
              </tr>
            </thead>
            <tbody>
              {REGION_IDS.map((r) => (
                <tr key={r}>
                  <td>{REGIONS[r].label}</td>
                  <td className="n">{(REGIONS[r].pop * 100).toFixed(1)}%</td>
                  <td className="n">{reg[r].pos.toFixed(0)}%</td>
                  <td className="n">{reg[r].neg.toFixed(0)}%</td>
                  <td className="n">{reg[r].net > 0 ? '+' : ''}{reg[r].net.toFixed(1)}</td>
                  <td className="n">{s.regions[r].governadores.cooperacao.toFixed(0)}</td>
                  <td className="n">{s.regions[r].governadores.alinhamento.toFixed(0)}</td>
                  <td className="n">{s.regions[r].governadores.necessidadeFiscal.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid cols-3">
          {REGION_IDS.map((r) => (
            <div key={r} className="sheet stack">
              <strong>{REGIONS[r].label}</strong>
              <Meter label="Cooperação dos governadores" value={s.regions[r].governadores.cooperacao} />
              <Meter label="Ótimo/bom do governo (%)" value={reg[r].pos} />
              <span className="xs muted">
                Composição social: {GROUP_IDS.map((gid) => `${GROUPS[gid].label} ${(REGIONS[r].mix[gid] * 100).toFixed(0)}%`).join(' · ')}
              </span>
            </div>
          ))}
        </div>
        <p className="xs muted">Alinhamento partidário não é obediência: a cooperação depende também de finanças estaduais e de medidas que afetem a arrecadação (ex.: ICMS). Políticas que dependem de estados executam menos quando a cooperação cai.</p>
      </Section>
    </>
  );
}

function topFatores(s: NonNullable<Game['state']>, gid: GroupId) {
  const by = new Map<string, number>();
  for (const [k, v] of Object.entries(s.groups[gid].stocks)) {
    const label = s.opinionLabels[k] ?? FACTOR_LABELS[k.split(':')[0] as keyof typeof FACTOR_LABELS] ?? k;
    by.set(label, (by.get(label) ?? 0) + v);
  }
  return [...by.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4);
}

export function Eleicoes({ g, onWhy }: { g: Game; onWhy: (i: IndicatorId) => void }) {
  const s = g.state!;
  const e = s.election;
  const proj = intencaoNacional(s, 1).nacional;
  return (
    <>
      <Section title="Opinião pública">
        <div className="grid cols-4">
          {(['aval_positiva', 'aval_negativa', 'aval_saldo', 'polarizacao', 'confianca_eleitoral', 'pc_mobilizacao'] as IndicatorId[]).map((i) => (
            <IndicatorTile key={i} s={s} ind={i} onWhy={onWhy} />
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Grupo</th>
                <th className="n">Ótimo/bom</th>
                <th className="n">Ruim/péssimo</th>
                <th>O que mais pesa na avaliação (pontos de saldo)</th>
              </tr>
            </thead>
            <tbody>
              {GROUP_IDS.map((gid) => {
                const o = groupOpinion(s, gid);
                return (
                  <tr key={gid}>
                    <td title={GROUPS[gid].descricao}>{GROUPS[gid].label}</td>
                    <td className="n">{o.pos.toFixed(0)}%</td>
                    <td className="n">{o.neg.toFixed(0)}%</td>
                    <td className="xs">
                      {topFatores(s, gid)
                        .map(([l, v]) => `${l} (${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(1)})`)
                        .join('; ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="xs muted">A avaliação de cada grupo se ajusta com defasagem às condições materiais, às políticas que o atingem e aos acontecimentos. Grupos e pesos são abstrações de jogo.</p>
      </Section>
      <Section title="Eleição presidencial de 2022" aside={<span className="badge prov-contrafactual">Simulação</span>}>
        <div className="grid cols-3">
          <div className="sheet stack small">
            <span className="eyebrow">Situação</span>
            <span>Candidatura do governo: {e.governoConcorre ? 'presidente concorre à reeleição' : 'sucessor'}{e.alianca !== 'indefinida' ? ` · aliança ${e.alianca}` : ''}</span>
            <span>Campanha: {e.campanhaAtiva ? 'em curso (ações em Governo → Campanha eleitoral)' : 'começa em 16 de agosto'}</span>
            <span>Comparecimento projetado: {comparecimento(s).toFixed(1)}%</span>
            {e.resultado && <span className="pill neutral">Resultado: {e.resultado.replace('_', ' ')}</span>}
          </div>
          <div className="sheet stack small">
            <span className="eyebrow">Projeção interna do comitê (sem margem)</span>
            {CAND_IDS.map((c) => (
              <Meter key={c} label={candidateLabel(s, c)} value={proj[c]} />
            ))}
          </div>
          <div className="sheet stack small">
            <span className="eyebrow">Efeito acumulado de campanha por região</span>
            {REGION_IDS.map((r) => (
              <span key={r} className="row" style={{ justifyContent: 'space-between' }}>
                {REGIONS[r].label}
                <span className="num">{e.campanhaRegional[r] >= 0 ? '+' : ''}{e.campanhaRegional[r].toFixed(1)} p.p.</span>
              </span>
            ))}
          </div>
        </div>
        {e.polls.length > 0 && (
          <div className="table-wrap">
            <table>
              <caption className="xs muted" style={{ textAlign: 'left' }}>
                Pesquisas simuladas por instituto fictício (margem ±2 p.p.). Não são pesquisas reais.
              </caption>
              <thead>
                <tr>
                  <th>Publicação</th>
                  <th>Instituto</th>
                  {CAND_IDS.map((c) => (
                    <th key={c} className="n">
                      {candidateLabel(s, c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {e.polls.map((p, k) => (
                  <tr key={k}>
                    <td>{turnLabel(p.turn)}</td>
                    <td className="xs">{p.instituto}</td>
                    {CAND_IDS.map((c) => (
                      <td key={c} className="n">
                        {p.intencao[c].toFixed(0)}%
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {e.rounds.map((r) => (
          <div key={r.turno} className="sheet stack">
            <span className="eyebrow">{r.turno}º turno — votos válidos (resultado simulado)</span>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Região</th>
                    {CAND_IDS.filter((c) => r.votosValidos[c] > 0.5).map((c) => (
                      <th key={c} className="n">
                        {candidateLabel(s, c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <b>Brasil</b>
                    </td>
                    {CAND_IDS.filter((c) => r.votosValidos[c] > 0.5).map((c) => (
                      <td key={c} className="n">
                        <b>{r.votosValidos[c].toFixed(1)}%</b>
                      </td>
                    ))}
                  </tr>
                  {REGION_IDS.map((rg) => (
                    <tr key={rg}>
                      <td>{REGIONS[rg].label}</td>
                      {CAND_IDS.filter((c) => r.votosValidos[c] > 0.5).map((c) => (
                        <td key={c} className="n">
                          {r.porRegiao[rg][c].toFixed(1)}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span className="small">Comparecimento: {r.comparecimento.toFixed(1)}%.</span>
          </div>
        ))}
        {e.rounds.length > 0 && (
          <details>
            <summary>Comparar com o resultado real de 2022 (TSE)</summary>
            <ul className="notes">
              {HISTORIA_REAL_2022.filter((h) => h.id.includes('turno')).map((h) => (
                <li key={h.id}>
                  {h.nome}: {h.valor}
                </li>
              ))}
            </ul>
          </details>
        )}
        <p className="xs muted">As candidaturas são rotuladas genericamente: o jogo não atribui intenções de voto simuladas a pessoas reais. Voto ≠ aprovação: depende também da parcela “regular”, da campanha regional, do tempo de TV e da mobilização. Indicador de {formatIndicator('aval_positiva', s.ind.aval_positiva)} ótimo/bom.</p>
      </Section>
    </>
  );
}
