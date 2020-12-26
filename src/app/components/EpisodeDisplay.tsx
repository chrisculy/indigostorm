import React from 'react';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { Container, Grid, Typography, Box } from '@material-ui/core';
import MapDisplay from './MapDisplay';
import { ReduxStore } from '../state/store';
import LeadsDisplay from './LeadsDisplay';
import { GameState, investigateLead } from '../state/game';

export type EpisodeDisplayProps = GameState & {
	dispatch: Dispatch;
};

const EpisodeDisplay: React.FC<EpisodeDisplayProps> = (props: EpisodeDisplayProps) => {
	const leads = props.episode.leads.filter(lead => props.episode.map.areas[props.activeAreaIndex].pois.some(poi => lead.id === poi.leadId));
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
				<Typography variant="subtitle1" color="textSecondary">{`Auxiliary Objective: ${props.episode.mission.secondaryObjective}`}</Typography>
			</Box>
			<Grid container spacing={2}>
				<Grid item xs={12}>
					<MapDisplay
						activeAreaIndex={props.activeAreaIndex}
						map={props.episode.map}
						leads={props.episode.leads}
						revealedAreas={props.revealedAreas}
						dispatch={props.dispatch}
					/>
				</Grid>
				<Grid item xs={12}>
					<LeadsDisplay
						leads={leads}
						characters={props.players.map(x => x.name)}
						investigateLead={(playerIndex: number, leadId: number) => props.dispatch(investigateLead({ playerIndex, leadId }))}
					/>
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
