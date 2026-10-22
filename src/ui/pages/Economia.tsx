import type { Game } from '../../app/useGame';
import { INDICATORS, formatIndicator, type IndicatorId } from '../../simulation/state/indicators';
import { SERIE_OFFSET } from '../../simulation/engine/context';
import { isoLabel, shortLabel, turnLabel, turnToDate } from '../../simulation/time/calendar';
import { COPOM_DATAS, META_PRIMARIA_2022 } from '../../content/historical-data/pack2022';
import { DISC_BASE_MENSAL, projetarTeto } from '../../systems/budget/fiscal';
import { IndicatorRows, IndicatorTile, Section, fmtBi } from '../components';

export function Economia({ g, onWhy }: { g: Game; onWhy: (i: IndicatorId) => void }) {
  const s = g.state!;
  const f = s.fiscal;
  const atraso = Number(s.flags.dados_atrasados_ate ?? -1) >= s.turn;
  const divulgados: IndicatorId[] = ['ipca_mes', 'ipca_12m', 'desemprego', 'pib_var_12m'];
  const proximoCopom = Object.entries(COPOM_DATAS).find(([m]) => Number(m) >= s.turn + 1);
  const discRestante = f.discricionarioAno - f.bloqueio - f.discricionarioGasto;
  const meses = 12 - (s.turn % 12);
  return (
    <>
      <Section title="Dados oficiais divulgados" aside={<span className="small muted">O período medido não é a data de publicação.</span>}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th className="n">Último dado divulgado</th>
                <th>Referência</th>
                <th>Fonte</th>
                <th className="n">Estimativa interna do modelo</th>
              </tr>
            </thead>
            <tbody>
              {divulgados.map((ind) => {
                const def = INDICATORS[ind];
                const lag = (def.divulgacao?.defasagem ?? 0) + (atraso && ind !== 'ipca_mes' && ind !== 'ipca_12m' ? 1 : 0);
                const ref = s.turn - lag;
                const v = s.serie[ind]?.[ref + SERIE_OFFSET];
                return (
                  <tr key={ind}>
                    <td>{def.label}</td>
                    <td className="n">{typeof v === 'number' ? formatIndicator(ind, v) : '—'}</td>
                    <td>
                      {shortLabel(turnToDate(ref))}
                      {ref < 0 ? ' (observado)' : ' (simulado)'}
                    </td>
                    <td className="small muted">{def.divulgacao?.fonte}</td>
                    <td className="n">{formatIndicator(ind, s.ind[ind])}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {atraso && <p className="warnings">Greve de servidores atrasou a divulgação de parte das estatísticas.</p>}
        <p className="xs muted">A estimativa interna corresponde ao fim do mês anterior no modelo. Decisões do mercado e do Copom reagem a ela; o eleitor reage ao que sente.</p>
      </Section>
      <Section title="Economia" aside={proximoCopom && <span className="small">Próximo Copom: {isoLabel(proximoCopom[1])}</span>}>
        <div className="grid cols-4">
          {(['pib_var_12m', 'ipca_12m', 'expect_ipca', 'selic', 'cambio', 'desemprego', 'combustivel', 'brent', 'commodities', 'hiato', 'confianca_empresarial', 'risco_pais', 'risco_fertilizantes'] as IndicatorId[]).map((i) => (
            <IndicatorTile key={i} s={s} ind={i} onWhy={onWhy} />
          ))}
        </div>
        <p className="xs muted">A linha pontilhada nos gráficos separa 2021 (dados observados, quando existentes) de 2022 (simulação). O Banco Central é autônomo: o governo não define a Selic.</p>
      </Section>
      <Section title="Orçamento e contas públicas" aside={<span className="small muted">Governo Central, R$ bilhões correntes.</span>}>
        <div className="split">
          <div className="sheet stack">
            <span className="eyebrow">Teto de gastos 2022</span>
            <dl className="facts">
              <dt>Limite</dt>
              <dd className="num">{fmtBi(f.teto)}</dd>
              <dt>Executado no ano</dt>
              <dd className="num">{fmtBi(f.despesaTetoAno)}</dd>
              <dt>Projeção anual</dt>
              <dd className="num">{fmtBi(projetarTeto(s, true))}</dd>
              <dt>Folga projetada</dt>
              <dd className="num" style={{ color: s.ind.teto_folga < 0 ? 'var(--bad)' : undefined }}>
                {fmtBi(s.ind.teto_folga)}
              </dd>
              <dt>Bloqueado</dt>
              <dd className="num">{fmtBi(f.bloqueio)}</dd>
              <dt>Exceções aprovadas</dt>
              <dd className="num">{fmtBi(f.excecaoTetoAprovada)}</dd>
              <dt>Gasto fora do teto</dt>
              <dd className="num">{fmtBi(f.foraDoTeto)}</dd>
            </dl>
            <span className="eyebrow">Discricionárias</span>
            <dl className="facts">
              <dt>Dotação anual</dt>
              <dd className="num">{fmtBi(f.discricionarioAno)}</dd>
              <dt>Executado</dt>
              <dd className="num">{fmtBi(f.discricionarioGasto)}</dd>
              <dt>Disponível</dt>
              <dd className="num">{fmtBi(discRestante)}</dd>
              <dt>Livre além do custeio</dt>
              <dd className="num">{fmtBi(discRestante - DISC_BASE_MENSAL * meses)}</dd>
              <dt>Custeio comprimido</dt>
              <dd className="num">{(s.econ.compressaoCusteio * 100).toFixed(0)}% no último mês</dd>
            </dl>
            <p className="xs muted">Programas pagos por remanejamento tiram recursos do custeio-base: a compressão aumenta filas e reduz capacidade dos órgãos. Relatórios bimestrais (mar, mai, jul, set, nov) bloqueiam despesas se a projeção passar do teto.</p>
          </div>
          <div className="sheet stack">
            <span className="eyebrow">Resultado e dívida</span>
            <IndicatorRows s={s} inds={['receita_ano', 'despesa_ano', 'primario_ano', 'juros_ano', 'receita_mes', 'despesa_mes', 'primario_mes', 'divida_bruta', 'pib_nominal', 'divida_pib']} onWhy={onWhy} />
            <p className="xs muted">
              Meta de resultado primário da LDO 2022: déficit de até {fmtBi(-META_PRIMARIA_2022)}. Acumulado em {turnLabel(Math.max(0, s.turn - 1))}: {fmtBi(s.ind.primario_ano)}.
            </p>
          </div>
        </div>
      </Section>
      <Section title="Serviços e ambiente">
        <div className="grid cols-4">
          {(['saude_fila', 'capacidade_adm', 'fiscalizacao_amb', 'desmatamento_12m'] as IndicatorId[]).map((i) => (
            <IndicatorTile key={i} s={s} ind={i} onWhy={onWhy} />
          ))}
        </div>
        <p className="xs muted">Educação, segurança pública e diplomacia detalhada ainda não estão modeladas nesta versão (ver Dados e fontes → Limitações).</p>
      </Section>
    </>
  );
}
