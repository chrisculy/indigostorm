import { Reducer } from 'redux';
import { createAction, getType, ActionType } from 'typesafe-actions';
import { Episodes } from '../episodes/episodes';
import { Dice, rollDice as roll } from '../models/Dice';
import { Episode } from '../models/Episode';
import { getInitialDiceForCharacter } from '../models/GameData';
import { PointOfInterest } from '../models/PointOfInterest';

export const playEpisode = createAction('GAME/PLAY_EPISODE')<number>();
export const setActiveArea = createAction('GAME/SET_ACTIVE_AREA')<number>();
export const investigatePoi = createAction('GAME/INVESTIGATE_POI')<number>();
export const observePoi = createAction('GAME/OBSERVE_POI')<number>();
export const rollDice = createAction('GAME/ROLL_DICE')<number>();
export const rollAllDice = createAction('GAME/ROLL_ALL_DICE')();

const GameActions = {
	playEpisode,
	setActiveArea,
	investigatePoi,
	observePoi,
	rollDice,
	rollAllDice,
};

type GameAction = ActionType<typeof GameActions>;

export interface PlayerHand {
	investigated: PointOfInterest[];
	observed: PointOfInterest[];
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
		investigated: [],
		observed: [],
	},
	dice: getInitialDiceForCharacter('medic'),
};

export const gameReducer: Reducer<GameState> = (state: GameState = initialState, action: GameAction): GameState => {
	switch (action.type) {
		case getType(GameActions.playEpisode):
			return { ...state, episode: Episodes[action.payload] };
		case getType(GameActions.setActiveArea):
			return { ...state, activeAreaIndex: action.payload };
		case getType(GameActions.observePoi): {
			const hand = { ...state.hand };
			const episode = { ...state.episode };
			const poi = episode.pointsOfInterest.filter(x => x.id === action.payload)[0];
			hand.observed.push(poi);
			episode.areas[state.activeAreaIndex].pointOfInterestIds = episode.areas[state.activeAreaIndex].pointOfInterestIds.filter(
				poiId => poiId !== action.payload
			);
			return { ...state, hand };
		}
		case getType(GameActions.investigatePoi): {
			const hand = { ...state.hand };
			const poi = hand.observed[action.payload];
			hand.investigated.push(poi);
			hand.observed.splice(action.payload, 1);
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
