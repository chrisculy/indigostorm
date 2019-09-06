import React from 'react';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { Container, Grid } from '@material-ui/core';
import { GameState, ReduxStore } from '../state/store';
import HandDisplay from './HandDisplay';
import DiceDisplay from './DiceDisplay';

export type PlayerDisplayProps = GameState;

const PlayerDisplay: React.StatelessComponent<PlayerDisplayProps> = (props: PlayerDisplayProps) => {
	return (
		<Container>
			<Grid container>
				<Grid item xs={4}>
					<DiceDisplay />
				</Grid>
				<Grid item xs={8}>
					<HandDisplay />
				</Grid>
			</Grid>
		</Container>
	);
};

const mapStateToProps = (store: ReduxStore): PlayerDisplayProps => {
	return {
		...store.game,
	};
};

const mapDispatchToProps = (_: Dispatch)  => {
	return {};
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(PlayerDisplay);
