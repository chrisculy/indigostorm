import React from 'react';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { Container, Grid, Typography } from '@material-ui/core';
import AreaDisplay from './AreaDisplay';
import { GameState, ReduxStore } from '../state/store';
import PointsOfInterestDisplay from './PointsOfInterestDisplay';
import { observePoi } from '../state/game';

export type EpisodeDisplayProps = GameState & {
	dispatch: Dispatch;
};

const EpisodeDisplay: React.StatelessComponent<EpisodeDisplayProps> = (props: EpisodeDisplayProps) => {
	const pois = props.episode.pointsOfInterest.filter(poi => props.episode.areas[props.activeAreaIndex].pointOfInterestIds.some(poiId => poi.id === poiId));
	return (
		<Container>
			<Typography variant="h6">{props.episode.name}</Typography>
			<Typography variant="subtitle2" color="textSecondary">
				{props.episode.mission.description}
			</Typography>
			<Typography variant="subtitle1">{`Primary Objective: ${props.episode.mission.primaryObjective}`}</Typography>
			<Typography variant="subtitle1" color="textSecondary">{`Auxiliary Objective: ${props.episode.mission.auxiliaryObjective}`}</Typography>
			<Grid container>
				<Grid item xs={12}>
					<AreaDisplay activeAreaIndex={props.activeAreaIndex} areas={props.episode.areas} dispatch={props.dispatch} />
				</Grid>
				<Grid item xs={12}>
					<PointsOfInterestDisplay pointsOfInterest={pois} observePoi={(poiId: number) => props.dispatch(observePoi(poiId))} />
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
		dispatch,
	};
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(EpisodeDisplay);
