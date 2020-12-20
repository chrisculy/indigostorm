import React from 'react';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { Container, Grid, Typography, Box } from '@material-ui/core';
import AreaDisplay from './AreaDisplay';
import { ReduxStore } from '../state/store';
import PointsOfInterestDisplay from './PointsOfInterestDisplay';
import { GameState, observePoi } from '../state/game';

export type EpisodeDisplayProps = GameState & {
	dispatch: Dispatch;
};

const EpisodeDisplay: React.StatelessComponent<EpisodeDisplayProps> = (props: EpisodeDisplayProps) => {
	const pois = props.episode.pointsOfInterest.filter(poi =>
		props.episode.areas[props.activeAreaIndex].pointOfInterestIds.some(poiId => poi.id === poiId)
	);
	return (
		<Container>
			<Box my={2}>
				<Typography variant="h6">{props.episode.name}</Typography>
			</Box>
			<Box my={1}>
				<Typography variant="subtitle2" color="textSecondary">
					{props.episode.mission.description}
				</Typography>
			</Box>
			<Box my={1}>
				<Typography variant="subtitle1">{`Primary Objective: ${props.episode.mission.primaryObjective}`}</Typography>
			</Box>
			<Box my={1}>
				<Typography variant="subtitle1" color="textSecondary">{`Auxiliary Objective: ${props.episode.mission.auxiliaryObjective}`}</Typography>
			</Box>
			<Grid container spacing={2}>
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

const ConnectedEpisodeDisplay = connect(
	mapStateToProps,
	mapDispatchToProps
)(EpisodeDisplay);

export { ConnectedEpisodeDisplay as EpisodeDisplay };
