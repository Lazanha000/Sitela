import { useState } from 'react';
import type { Game } from '../../app/useGame';
import { ALL_INDICATORS, INDICATORS, type IndicatorId } from '../../simulation/state/indicators';
import type { Provenance } from '../../simulation/state/types';
import { turnLabel } from '../../simulation/time/calendar';
import { DATA_RECORDS, HISTORIA_REAL_2022 } from '../../content/historical-data/pack2022';
import { EDITORIA_LABEL } from '../../systems/media/news';
import { ENGINE_VERSION, GAME_STAGE, GAME_VERSION, SCHEMA_VERSION } from '../../simulation/version';
import { PROV_LABEL, Prov, Section } from '../components';
import { ReportBody } from './Relatorio';

export function Arquivo({ g, onWhy }: { g: Game; onWhy: (i: IndicatorId) => void }) {
  const s = g.state!;
  const [mes, setMes] = useState(Math.max(0, s.reports.length - 1));
  const r = s.reports[mes];
  const noticias = s.news.filter((n) => n.turn === mes + 1 || (mes === 0 && n.turn === 0));
  return (
    <>
      <Section
        title="Arquivo de relatórios"
        aside={
          s.reports.length > 0 && (
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              Mês
              <select id="arquivo-mes" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                {s.reports.map((x, k) => (
                  <option key={x.turn} value={k}>
                    {turnLabel(x.turn)}
                  </option>
                ))}
              </select>
            </label>
          )
        }
      >
        {!r ? <p className="muted">Nenhum mês fechado ainda.</p> : <ReportBody s={s} r={r} onWhy={onWhy} />}
      </Section>
      {r && (
        <Section title={`Edição publicada após ${turnLabel(r.turn)}`}>
          <div className="stories">
            {noticias.map((n) => (
              <article key={n.id} className="story">
                <div className="story-meta">
                  <span className="eyebrow">{EDITORIA_LABEL[n.editoria]}</span>
                  <Prov p={n.provenance} />
                </div>
                <h3>{n.titulo}</h3>
                <p className="standfirst">{n.linha_fina}</p>
              </article>
            ))}
          </div>
        </Section>
      )}
      <Section title="Registro de decisões">
        {s.log.length + s.currentActions.length === 0 ? (
          <p className="muted">Nenhuma decisão registrada.</p>
        ) : (
          <ul className="notes">
            {[...s.log, ...s.currentActions].map((l, k) => (
              <li key={k}>
                {turnLabel(l.turn)}: {l.descricao}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

const LIMITACOES = [
  'Educação, segurança pública e diplomacia (além de eventos pontuais) ainda não têm sistemas próprios; não aparecem como menus sem efeito.',
  'Federação agregada em 5 regiões; não há estados nem municípios individuais, nem mapa interativo (previsto para a v0.2).',
  'Congresso agregado em 4 bancadas; sem parlamentares individuais, comissões nominais, vetos, destaques ou emendas de plenário.',
  'Ministros não são nomeados individualmente; capacidade administrativa é um índice por órgão.',
  'Economia em modelo de hiato simplificado; sem setores produtivos, crédito, balança comercial ou contas estaduais.',
  'Coeficientes causais são abstrações de jogo calibradas para plausibilidade com a trajetória de 2022 — não são estimativas econométricas.',
  'Alguns valores históricos foram transcritos de memória e estão marcados para verificação (ver tabela de fontes).',
  'Empacotamento Android (Capacitor) e desktop (Tauri) apenas documentado: nada foi compilado nem testado nessas plataformas.',
];

export function Dados({ g }: { g: Game }) {
  const s = g.state;
  return (
    <>
      <Section title="Natureza das informações">
        <div className="grid cols-3">
          {(Object.keys(PROV_LABEL) as Provenance[]).map((p) => (
            <div key={p} className="row small">
              <Prov p={p} />
              <span className="muted">
                {{
                  fato: 'Ocorreu no mundo real, com fonte verificável.',
                  observado: 'Indicador publicado por instituição, com período de referência.',
                  estimativa: 'Valor estimado por fonte identificada ou pelo modelo.',
                  abstracao: 'Simplificação deliberada para tornar o sistema jogável.',
                  contrafactual: 'Resultado desta campanha; não é fato histórico.',
                  projecao: 'Resultado condicional a hipóteses.',
                }[p]}
              </span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Fontes do pacote histórico 2022">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dado</th>
                <th>Valor</th>
                <th>Referência</th>
                <th>Fonte</th>
                <th>Natureza</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {DATA_RECORDS.map((d) => (
                <tr key={d.id}>
                  <td>{d.nome}</td>
                  <td>{d.valor}</td>
                  <td className="xs">
                    {d.referencia}
                    {d.publicacao ? ` · publ. ${d.publicacao}` : ''}
                  </td>
                  <td className="xs">{d.url ? <a href={d.url} target="_blank" rel="noreferrer">{d.fonte}</a> : d.fonte}</td>
                  <td>
                    <Prov p={d.tipo} />
                  </td>
                  <td className="xs">{d.notas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Indicadores do modelo">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Unidade</th>
                <th>Natureza</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {ALL_INDICATORS.map((k) => (
                <tr key={k}>
                  <td>
                    {INDICATORS[k].label} {INDICATORS[k].abstracao && <Prov p="abstracao" />}
                  </td>
                  <td className="xs">{INDICATORS[k].unidade}</td>
                  <td className="xs">{INDICATORS[k].natureza}</td>
                  <td className="xs">{INDICATORS[k].descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Limitações desta versão">
        <ul className="notes">
          {LIMITACOES.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </Section>
      <Section title="O que aconteceu de verdade em 2022">
        <details>
          <summary>Mostrar a trajetória real (contém spoilers)</summary>
          <ul className="notes">
            {HISTORIA_REAL_2022.map((h) => (
              <li key={h.id}>
                <b>{h.nome}</b>: {h.valor} <span className="xs muted">({h.fonte}{h.notas ? `; ${h.notas}` : ''})</span>
              </li>
            ))}
          </ul>
        </details>
      </Section>
      <Section title="Versões">
        <dl className="facts">
          <dt>Jogo</dt>
          <dd>
            {GAME_VERSION} ({GAME_STAGE})
          </dd>
          <dt>Motor</dt>
          <dd>{ENGINE_VERSION}</dd>
          <dt>Formato de salvamento</dt>
          <dd>{SCHEMA_VERSION}</dd>
          {s && (
            <>
              <dt>Pacote de dados</dt>
              <dd>{s.meta.dataPackVersion}</dd>
              <dt>Semente</dt>
              <dd className="num">{s.meta.seed}</dd>
              <dt>Migrações aplicadas</dt>
              <dd>{s.migrations.length ? s.migrations.join(', ') : 'nenhuma'}</dd>
            </>
          )}
        </dl>
      </Section>
    </>
  );
}
