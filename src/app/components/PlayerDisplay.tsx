import React from 'react';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { Container, Grid } from '@material-ui/core';
import { GameState, ReduxStore } from '../state/store';
import HandDisplay from './HandDisplay';
import DiceDisplay from './DiceDisplay';
import { investigatePoi } from '../state/game';

export type PlayerDisplayProps = GameState & {
	dispatch: Dispatch;
};

const PlayerDisplay: React.StatelessComponent<PlayerDisplayProps> = (props: PlayerDisplayProps) => {
	return (
		<Container>
			<Grid container spacing={2}>
				<Grid item xs={12}>
					<HandDisplay hand={props.hand} investigatePoi={(observedPoiIndex: number) => props.dispatch(investigatePoi(observedPoiIndex))} />
				</Grid>
				<Grid item xs={12}>
					<DiceDisplay />
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

const mapDispatchToProps = (dispatch: Dispatch)  => {
	return {
		dispatch
	};
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(PlayerDisplay);
