import { Reducer } from 'redux';
import { createAction, getType, ActionType } from 'typesafe-actions';
import { Episodes } from '../episodes/episodes';
import { Dice, rollDice as roll } from '../models/Dice';
import { Episode } from '../models/Episode';
import { getInitialDiceForCharacter } from '../models/GameData';
import { Lead } from '../models/Lead';

export const playEpisode = createAction('GAME/PLAY_EPISODE')<number>();
export const setActiveArea = createAction('GAME/SET_ACTIVE_AREA')<number>();
export const acquireClue = createAction('GAME/ACQUIRE_CLUE')<number>();
export const investigateLead = createAction('GAME/INVESTIGATE_LEAD')<number>();
export const rollDice = createAction('GAME/ROLL_DICE')<number>();
export const rollAllDice = createAction('GAME/ROLL_ALL_DICE')();

const GameActions = {
	playEpisode,
	setActiveArea,
	acquireClue,
	investigateLead,
	rollDice,
	rollAllDice,
};

type GameAction = ActionType<typeof GameActions>;

export interface PlayerHand {
	clues: Lead[];
	leads: Lead[];
}

export interface GameState {
	episode: Episode;
	activeAreaIndex: number;
	hand: PlayerHand;
	dice: Dice[];
}

const initialState: GameState = {
	activeAreaIndex: 0,
	episode: Episodes[0],
	hand: {
		clues: [],
		leads: [],
	},
	dice: getInitialDiceForCharacter('medic'),
};

export const gameReducer: Reducer<GameState> = (state: GameState = initialState, action: GameAction): GameState => {
	switch (action.type) {
		case getType(GameActions.playEpisode):
			return { ...state, episode: Episodes[action.payload] };
		case getType(GameActions.setActiveArea):
			return { ...state, activeAreaIndex: action.payload };
		case getType(GameActions.investigateLead): {
			const hand = { ...state.hand };
			const episode = { ...state.episode };
			const lead = episode.leads.filter(x => x.id === action.payload)[0];
			hand.leads.push(lead);
			episode.areas[state.activeAreaIndex].leadIds = episode.areas[state.activeAreaIndex].leadIds.filter(leadId => leadId !== action.payload);
			return { ...state, hand };
		}
		case getType(GameActions.acquireClue): {
			const hand = { ...state.hand };
			const clue = hand.leads[action.payload];
			hand.clues.push(clue);
			hand.leads.splice(action.payload, 1);
			return { ...state, hand };
		}
		case getType(GameActions.rollDice): {
			const dice = [...state.dice];
			roll(dice[action.payload]);
			return { ...state, dice };
		}
		case getType(GameActions.rollAllDice): {
			const dice = [...state.dice];
			for (let i = 0; i < dice.length; i++) {
				roll(dice[i]);
			}
			return { ...state, dice };
		}
	}

	return state;
};
