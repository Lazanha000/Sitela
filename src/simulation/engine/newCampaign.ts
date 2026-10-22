import { buildInitialState, type NewCampaignOptions } from '../../content/scenarios/brasil2022';
import type { WorldState } from '../state/types';
import { openTurn } from './turn';

/** Nova campanha em 1º de janeiro de 2022 (nunca a data do sistema). */
export function newCampaign(opts: NewCampaignOptions = {}): WorldState {
  const s = buildInitialState(opts);
  openTurn(s);
  return s;
}
