import React from 'react';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { Container, Grid, Typography } from '@material-ui/core';
import Episodes from '../episodes/episodes';
import AreaDisplay from './AreaDisplay';
import { GameState, ReduxStore } from '../state/store';
import PointsOfInterestDisplay from './PointsOfInterestDisplay';

export type EpisodeDisplayProps = GameState & {
	dispatch: Dispatch;
};

const EpisodeDisplay: React.StatelessComponent<EpisodeDisplayProps> = (props: EpisodeDisplayProps) => {
	const episode = Episodes[props.episodeIndex];
	const pois = episode.pointsOfInterest.filter(poi => episode.areas[props.activeAreaIndex].pointOfInterestIds.some(poiId => poi.id === poiId));
	return (
		<Container>
			<Typography variant="h6">{episode.name}</Typography>
			<Typography variant="subtitle2" color="textSecondary">
				{episode.mission.description}
			</Typography>
			<Typography variant="subtitle1">{`Primary Objective: ${episode.mission.primaryObjective}`}</Typography>
			<Typography variant="subtitle1" color="textSecondary">{`Auxiliary Objective: ${episode.mission.auxiliaryObjective}`}</Typography>
			<Grid container>
				<Grid item xs={12}>
					<AreaDisplay activeAreaIndex={props.activeAreaIndex} areas={episode.areas} dispatch={props.dispatch} />
				</Grid>
				<Grid item xs={12}>
					<PointsOfInterestDisplay pointsOfInterest={pois} />
				</Grid>
			</Grid>
		</Container>
	);
};

const mapStateToProps = (store: ReduxStore) => {
	return {
		...store.game,
	};
};

const mapDispatchToProps = (dispatch: Dispatch) => {
	return {
		dispatch
	};
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(EpisodeDisplay);
