import { createAction, getType, ActionType } from 'typesafe-actions';
import { Episodes } from '../episodes/episodes';
import { Dice, rollDice as roll } from '../models/Dice';
import { Episode } from '../models/Episode';
import { getInitialDiceForCharacter } from '../models/GameData';
import { Lead } from '../models/Lead';

export const playEpisode = createAction('GAME/PLAY_EPISODE')<{ episodeIndex: number; characterOne: string; characterTwo: string }>();
export const setActiveArea = createAction('GAME/SET_ACTIVE_AREA')<number>();
export const acquireClue = createAction('GAME/ACQUIRE_CLUE')<{ playerIndex: number; leadIndex: number }>();
export const investigateLead = createAction('GAME/INVESTIGATE_LEAD')<{ playerIndex: number; leadId: number }>();
export const rollDice = createAction('GAME/ROLL_DICE')<{ playerIndex: number; diceIndex: number }>();
export const rollAllDice = createAction('GAME/ROLL_ALL_DICE')<{ playerIndex: number }>();

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

export interface Player {
	name: string;
	currentAreaIndex: number;
	hand: PlayerHand;
	dice: Dice[];
}

export interface GameState {
	episode: Episode;
	revealedAreas: string[];
	activeAreaIndex: number;
	players: Player[];
}

const initialState: GameState = {
	activeAreaIndex: 0,
	episode: Episodes[0],
	revealedAreas: ['A', 'B', 'C', 'D', 'E'],
	players: [
		{
			name: 'medic',
			currentAreaIndex: 0,
			hand: { clues: [], leads: [] },
			dice: getInitialDiceForCharacter('medic'),
		},
		{
			name: 'hacker',
			currentAreaIndex: 0,
			hand: { clues: [], leads: [] },
			dice: getInitialDiceForCharacter('hacker'),
		},
	],
};

export const gameReducer = (state: GameState = initialState, action: GameAction): GameState => {
	switch (action.type) {
		case getType(GameActions.playEpisode): {
			const players: Player[] = [
				{
					name: action.payload.characterOne,
					currentAreaIndex: 0,
					hand: { clues: [], leads: [] },
					dice: getInitialDiceForCharacter(action.payload.characterOne),
				},
				{
					name: action.payload.characterTwo,
					currentAreaIndex: 0,
					hand: { clues: [], leads: [] },
					dice: getInitialDiceForCharacter(action.payload.characterTwo),
				},
			];
			return {
				...state,
				episode: Episodes[action.payload.episodeIndex],
				players,
				revealedAreas: Episodes[action.payload.episodeIndex].map.areas.map(x => x.name),
			};
		}
		case getType(GameActions.setActiveArea):
			return { ...state, activeAreaIndex: action.payload };
		case getType(GameActions.investigateLead): {
			const players = [...state.players];
			const episode = { ...state.episode };
			const lead = episode.leads.filter(x => x.id === action.payload.leadId)[0];
			players[action.payload.playerIndex].hand.leads.push(lead);
			episode.map.areas[state.activeAreaIndex].pois = episode.map.areas[state.activeAreaIndex].pois.filter(
				poi => poi.leadId !== action.payload.leadId
			);
			return { ...state, players };
		}
		case getType(GameActions.acquireClue): {
			const players = [...state.players];
			const clue = players[action.payload.playerIndex].hand.leads[action.payload.leadIndex];
			players[action.payload.playerIndex].hand.clues.push(clue);
			players[action.payload.playerIndex].hand.leads.splice(action.payload.leadIndex, 1);
			return { ...state, players };
		}
		case getType(GameActions.rollDice): {
			const players = [...state.players];
			roll(players[action.payload.playerIndex].dice[action.payload.diceIndex]);
			return { ...state, players };
		}
		case getType(GameActions.rollAllDice): {
			const players = [...state.players];
			for (let i = 0; i < players[action.payload.playerIndex].dice.length; i++) {
				roll(players[action.payload.playerIndex].dice[i]);
			}
			return { ...state, players };
		}
	}

	return state;
};
