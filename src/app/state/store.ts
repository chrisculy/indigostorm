import { createStore } from 'redux';
import { combineReducers } from 'redux';
import { gameReducer, GameState } from './game';

export interface ReduxStore {
	game: GameState;
}

const reducer = combineReducers<ReduxStore>({
	game: gameReducer,
});

export const store = createStore(reducer);
