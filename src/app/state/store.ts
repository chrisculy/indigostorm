import { createStore } from "redux";
import { combineReducers } from "redux";
import { gameReducer } from "./game";
import Episode from "../models/Episode";
import PointOfInterest from "../models/PointOfInterest";

export interface PlayerHand {
	investigated: PointOfInterest[],
	observed: PointOfInterest[],
}

export interface GameState {
	episode: Episode;
	activeAreaIndex: number;
	hand: PlayerHand;
};

export interface ReduxStore {
	game: GameState;
};

const reducer = combineReducers<ReduxStore>({
	game: gameReducer
})

export const store = createStore(reducer);
