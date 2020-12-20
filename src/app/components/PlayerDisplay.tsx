import React from 'react';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { Container, Grid } from '@material-ui/core';
import { ReduxStore } from '../state/store';
import { HandDisplay } from './HandDisplay';
import { DiceDisplay } from './DiceDisplay';
import { GameState, investigatePoi } from '../state/game';
import { Dice } from '../models/Dice';

export type PlayerDisplayProps = GameState & {
	dispatch: Dispatch;
};

const mapDiceToDiceDisplay = (dice: Dice, index?: number) => {
	const rolled = !!dice.currentFaceIndex;
	const diceFace = dice.currentFaceIndex ? dice.faces[dice.currentFaceIndex] : dice.faces[0];
	return (
		<Grid item xs={2} key={index !== undefined ? `diceDisplay_${index}` : undefined}>
			<DiceDisplay color={dice.color} rolled={rolled} action={diceFace.action} value={diceFace.value} />
		</Grid>
	);
};

const PlayerDisplay: React.FC<PlayerDisplayProps> = (props: PlayerDisplayProps) => {
	const diceDisplays = props.dice.map(mapDiceToDiceDisplay);
	return (
		<Container>
			<Grid container spacing={2}>
				<Grid item xs={12}>
					<HandDisplay hand={props.hand} investigatePoi={(observedPoiIndex: number) => props.dispatch(investigatePoi(observedPoiIndex))} />
				</Grid>
				<Grid item xs={6}>
					<Grid container spacing={2}>
						{diceDisplays}
					</Grid>
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

const ConnectedPlayerDisplay = connect(
	mapStateToProps,
	mapDispatchToProps
)(PlayerDisplay);

export { ConnectedPlayerDisplay as PlayerDisplay };
