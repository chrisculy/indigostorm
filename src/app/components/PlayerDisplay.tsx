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
			<Grid container>
				<Grid item xs={4}>
					<DiceDisplay />
				</Grid>
				<Grid item xs={8}>
					<HandDisplay hand={props.hand} investigatePoi={(observedPoiIndex: number) => props.dispatch(investigatePoi(observedPoiIndex))} />
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
