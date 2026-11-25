import { createContext, useContext } from 'react';
import type { Action, GameState, PlayerView } from '../../engine/index.ts';
import type { Option } from '../../state/derive.ts';

/** Everything the table's parts need, computed once per render in <Table>. */
export interface TableCtl {
  state: GameState;
  v: PlayerView;
  options: Option[];
  /** Options after narrowing to `targetSlot`. */
  visible: Option[];
  targetSlots: ReadonlySet<number>;
  deployTarget: boolean;
  playable: ReadonlySet<string>;
  hintKey: string | null;
  hint: Action | null;
  hoverOption: Option | null;
  /** Slots cleared by the last action (burst animation), keyed by eventSeq. */
  burstSlots: ReadonlySet<number>;
  eventSeq: number;
  choose: (o: Option) => void;
  perform: (a: Action) => void;
  clickSlot: (slot: number) => void;
  clickDeploy: () => void;
  endPlays: () => void;
  hintNow: () => void;
  openRulebook: () => void;
  locked: boolean;
}

export const TableContext = createContext<TableCtl | null>(null);

export function useTable(): TableCtl {
  const c = useContext(TableContext);
  if (!c) throw new Error('useTable outside <Table>');
  return c;
}
