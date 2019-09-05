import { createAction, getType, ActionType } from 'typesafe-actions';
import { GameState } from './store';

export const playEpisode = createAction('GAME/PLAY_EPISODE', action => {
	return (episodeIndex: number) => action({ episodeIndex });
})

export const setActiveArea = createAction('GAME/SET_ACTIVE_AREA', action => {
	return (activeAreaIndex: number) => action({ activeAreaIndex });
})

const GameActions = {
	playEpisode,
	setActiveArea
};

type GameAction = ActionType<typeof GameActions>;

const initialState: GameState = {
	activeAreaIndex: 0,
	episodeIndex: 0
};

export const gameReducer = (state: GameState = initialState, action: GameAction): GameState => {
	switch (action.type) {
		case getType(GameActions.playEpisode):
			return { ...state, episodeIndex: action.payload.episodeIndex };
		case getType(GameActions.setActiveArea):
			return { ...state, activeAreaIndex: action.payload.activeAreaIndex };
	}

	return state;
}

