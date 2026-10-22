/**
 * Migrações explícitas do formato de salvamento (spec §22.2).
 * Cada entrada converte o esquema N para N+1. Nunca descarta campos
 * essenciais; registra o passo em `state.migrations`.
 */
import { SCHEMA_VERSION } from '../simulation/version';

export type Migration = (raw: Record<string, any>) => Record<string, any>;

/** Esquema 1 é o primeiro publicado (v0.1); ainda não há migrações. */
export const MIGRATIONS: Record<number, Migration> = {};

export function migrate(raw: Record<string, any>, table: Record<number, Migration> = MIGRATIONS, target = SCHEMA_VERSION): Record<string, any> {
  let cur = raw;
  let v = Number(cur?.meta?.schemaVersion ?? 0);
  if (v > target) throw new Error(`Salvamento criado por uma versão mais nova do jogo (esquema ${v}; suportado até ${target}).`);
  while (v < target) {
    const step = table[v];
    if (!step) throw new Error(`Não há migração do esquema ${v} para ${v + 1}.`);
    cur = step(structuredClone(cur));
    cur.meta.schemaVersion = v + 1;
    cur.migrations = [...(cur.migrations ?? []), `esquema ${v} → ${v + 1}`];
    v++;
  }
  return cur;
}
