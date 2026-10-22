import { useState } from 'react';
import type { Game } from '../../app/useGame';
import { exportJson } from '../../persistence/saves';
import { GAME_STAGE, GAME_VERSION } from '../../simulation/version';
import { ConfirmButton, Section } from '../components';

function NovaCampanha({ g, temCampanha }: { g: Game; temCampanha: boolean }) {
  const [seed, setSeed] = useState(() => `brasil-${Math.floor(Math.random() * 1e6)}`);
  const [name, setName] = useState('Meu governo');
  const [difficulty, setDifficulty] = useState<'normal' | 'dificil'>('normal');
  const start = () => void g.iniciar({ seed, name, difficulty });
  return (
    <div className="sheet stack">
      <span className="eyebrow">Nova campanha — 1º de janeiro de 2022</span>
      <div className="grid cols-3">
        <label className="field">
          Nome
          <input id="nova-nome" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          Semente (reprodutibilidade)
          <input id="nova-semente" value={seed} onChange={(e) => setSeed(e.target.value)} />
        </label>
        <label className="field">
          Dificuldade
          <select id="nova-dificuldade" value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'normal' | 'dificil')}>
            <option value="normal">Normal</option>
            <option value="dificil">Difícil (choques 30% mais fortes)</option>
          </select>
        </label>
      </div>
      <span className="xs muted">A mesma semente com as mesmas decisões reproduz exatamente a mesma campanha.</span>
      <div>{temCampanha ? <ConfirmButton className="btn primary" label="Começar nova campanha" confirmLabel="Abandonar a atual e começar" onConfirm={start} /> : <button className="btn primary big" onClick={start}>Começar a governar</button>}</div>
    </div>
  );
}

function Lista({ g }: { g: Game }) {
  if (g.saves.length === 0) return <p className="muted">Nenhum salvamento neste dispositivo.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Campanha</th>
            <th>Tipo</th>
            <th>Data no jogo</th>
            <th className="n">Ótimo/bom</th>
            <th>Salvo em</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {g.saves.map((m) => (
            <tr key={m.id}>
              <td>{m.resumo.nome}</td>
              <td className="xs">{m.label}</td>
              <td>{m.resumo.encerrada ? 'encerrada' : m.resumo.data}</td>
              <td className="n">{m.resumo.avaliacao.toFixed(0)}%</td>
              <td className="xs">{new Date(m.savedAtReal).toLocaleString('pt-BR')}</td>
              <td>
                <div className="row">
                  <button className="btn" onClick={() => void g.carregar(m.id)}>
                    Carregar
                  </button>
                  <ConfirmButton className="btn danger" label="Excluir" confirmLabel="Excluir de vez" onConfirm={() => void g.excluir(m.id)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Importar({ g }: { g: Game }) {
  const [texto, setTexto] = useState('');
  return (
    <div className="sheet stack">
      <span className="eyebrow">Importar campanha (JSON)</span>
      <input
        id="importar-arquivo"
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void f.text().then((t) => g.importar(t));
        }}
      />
      <textarea id="importar-texto" placeholder="…ou cole aqui o JSON exportado" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div>
        <button className="btn" disabled={!texto.trim()} onClick={() => void g.importar(texto)}>
          Importar texto colado
        </button>
      </div>
    </div>
  );
}

export function Salvamentos({ g }: { g: Game }) {
  const s = g.state;
  const [label, setLabel] = useState('');
  const [exportado, setExportado] = useState('');
  return (
    <>
      {s && (
        <Section title="Campanha atual">
          <div className="sheet stack">
            <div className="row">
              <label className="field" style={{ flex: '1 1 240px' }}>
                Nome do salvamento
                <input id="salvar-nome" value={label} placeholder="ex.: antes da PEC" onChange={(e) => setLabel(e.target.value)} />
              </label>
              <button className="btn primary" style={{ alignSelf: 'end' }} onClick={() => void g.salvarManual(label)}>
                Salvar agora
              </button>
            </div>
            <span className="xs muted">O jogo também salva automaticamente ao fim de cada mês e guarda uma cópia de segurança do salvamento anterior.</span>
            <div className="row">
              <button className="btn" onClick={() => setExportado(exportJson(s))}>
                Exportar como JSON
              </button>
              <ConfirmButton label="Fechar campanha" confirmLabel="Fechar (fica salva)" onConfirm={g.fechar} />
            </div>
            {exportado && (
              <div className="stack">
                <textarea id="exportado" readOnly value={exportado} onFocus={(e) => e.target.select()} />
                <div className="row">
                  <button
                    className="btn"
                    onClick={() => {
                      navigator.clipboard?.writeText(exportado).catch(() => undefined);
                    }}
                  >
                    Copiar
                  </button>
                  <span className="xs muted">Guarde o texto em um arquivo .json para importar depois ou em outro dispositivo.</span>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}
      <Section title="Nova campanha">
        <NovaCampanha g={g} temCampanha={!!s} />
      </Section>
      <Section title="Salvamentos neste dispositivo" aside={!g.persistente && <span className="pill warn">Armazenamento local indisponível: salvamentos só duram até fechar a página</span>}>
        <Lista g={g} />
      </Section>
      <Section title="Importar">
        <Importar g={g} />
      </Section>
    </>
  );
}

export function Boas({ g }: { g: Game }) {
  return (
    <div className="welcome">
      <span className="eyebrow">
        Versão {GAME_VERSION} · {GAME_STAGE}
      </span>
      <h2>Brasília, 1º de janeiro de 2022. O Executivo federal é seu. O resto do país, não.</h2>
      <p>
        Você conduz o governo federal ao longo de 2022, sob as regras reais: Congresso bicameral, Banco Central autônomo, STF, teto de gastos, federação e a lei eleitoral. Cada decisão tem custo, prazo, quem ganha e quem paga. Os efeitos chegam com atraso, e o jornal explica o que mudou e por quê. Em outubro, o eleitor decide.
      </p>
      <p className="small muted">Fatos históricos, dados observados, estimativas e abstrações de jogo estão rotulados. Os resultados da sua campanha são contrafactuais.</p>
      <NovaCampanha g={g} temCampanha={false} />
      {g.saves.length > 0 && (
        <div className="stack">
          <span className="eyebrow">Continuar</span>
          <Lista g={g} />
        </div>
      )}
      <Importar g={g} />
    </div>
  );
}
