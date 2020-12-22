import React from 'react';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { RiHandCoinFill } from 'react-icons/ri';
import { Button, Container, Grid } from '@material-ui/core';
import { ReduxStore } from '../state/store';
import { HandDisplay } from './HandDisplay';
import { DiceDisplay } from './DiceDisplay';
import { GameState, acquireClue, rollAllDice, rollDice } from '../state/game';
import { Dice } from '../models/Dice';
import { iconStyle } from '../utility';

export type PlayerDisplayProps = GameState & {
	dispatch: Dispatch;
};

const mapDiceToDiceDisplay = (dice: Dice, index: number, onRollDiceClicked: (index: number) => void) => {
	const rolled = !!dice.currentFaceIndex;
	const diceFace = dice.currentFaceIndex ? dice.faces[dice.currentFaceIndex] : dice.faces[0];
	return (
		<Grid item xs={2} key={index !== undefined ? `diceDisplay_${index}` : undefined}>
			<DiceDisplay color={dice.color} rolled={rolled} action={diceFace.action} value={diceFace.value} rollDice={() => onRollDiceClicked(index)} />
		</Grid>
	);
};

const PlayerDisplay: React.FC<PlayerDisplayProps> = (props: PlayerDisplayProps) => {
	const onRollDiceClicked = (index: number) => {
		props.dispatch(rollDice(index));
	};

	const onRollAllDiceClicked = () => {
		props.dispatch(rollAllDice());
	};

	const diceDisplays = props.dice.map((dice: Dice, index: number) => mapDiceToDiceDisplay(dice, index, onRollDiceClicked));
	return (
		<Container>
			<Grid container spacing={2}>
				<Grid item xs={12}>
					<HandDisplay hand={props.hand} acquireClue={(observedPoiIndex: number) => props.dispatch(acquireClue(observedPoiIndex))} />
				</Grid>
				<Grid item xs={6}>
					<Grid container spacing={2}>
						{diceDisplays}
						<Grid item xs={12}>
							<Button onClick={() => onRollAllDiceClicked()} style={{ width: '80%' }}>
								<RiHandCoinFill style={iconStyle} />
							</Button>
						</Grid>
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
