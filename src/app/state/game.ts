import { createAction, getType, ActionType } from 'typesafe-actions';
import { GameState } from './store';
import Episodes from '../episodes/episodes';

export const playEpisode = createAction('GAME/PLAY_EPISODE', action => {
	return (episodeIndex: number) => action({ episodeIndex });
})

export const setActiveArea = createAction('GAME/SET_ACTIVE_AREA', action => {
	return (activeAreaIndex: number) => action({ activeAreaIndex });
})

export const investigatePoi = createAction('GAME/INVESTIGATE_POI', action => {
	return (observedPoiIndex: number) => action({ observedPoiIndex });
})

export const observePoi = createAction('GAME/OBSERVE_POI', action => {
	return (poiId: number) => action({ poiId });
})

const GameActions = {
	playEpisode,
	setActiveArea,
	investigatePoi,
	observePoi,
};

type GameAction = ActionType<typeof GameActions>;

const initialState: GameState = {
	activeAreaIndex: 0,
	episode: Episodes[0],
	hand: {
		investigated: [
		],
		observed: [
		],
	},
};

export const gameReducer = (state: GameState = initialState, action: GameAction): GameState => {
	switch (action.type) {
		case getType(GameActions.playEpisode):
			return { ...state, episode: Episodes[action.payload.episodeIndex] };
		case getType(GameActions.setActiveArea):
			return { ...state, activeAreaIndex: action.payload.activeAreaIndex };
		case getType(GameActions.observePoi):
		{
			const hand = { ...state.hand };
			const episode = { ...state.episode };
			const poi = episode.pointsOfInterest.filter(x => x.id === action.payload.poiId)[0];
			hand.observed.push(poi);
			episode.areas[state.activeAreaIndex].pointOfInterestIds = episode.areas[state.activeAreaIndex].pointOfInterestIds.filter(poiId => poiId !== action.payload.poiId);
			return { ...state, hand };
		}
		case getType(GameActions.investigatePoi):
		{
			const hand = { ...state.hand };
			const poi = hand.observed[action.payload.observedPoiIndex];
			hand.investigated.push(poi);
			hand.observed.splice(action.payload.observedPoiIndex, 1);
			return { ...state, hand };
		}
	}

	return state;
}

