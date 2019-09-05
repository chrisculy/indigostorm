import { createStore } from "redux";
import { combineReducers } from "redux";
import { gameReducer } from "./game";

export interface GameState {
	episodeIndex: number;
	activeAreaIndex: number;
};

export interface ReduxStore {
	game: GameState;
};

const reducer = combineReducers<ReduxStore>({
	game: gameReducer
})

export const store = createStore(reducer);
