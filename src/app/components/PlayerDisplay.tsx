import React from 'react';
import { Dispatch } from 'redux';
import { RiHandCoinFill } from 'react-icons/ri';
import { Button, Container, Grid, Typography } from '@material-ui/core';
import { HandDisplay } from './HandDisplay';
import { DiceDisplay } from './DiceDisplay';
import { acquireClue, rollAllDice, rollDice, Player } from '../state/game';
import { Dice } from '../models/Dice';
import { iconStyle } from '../utility';

export interface PlayerDisplayProps {
	playerIndex: number;
	player: Player;
	dispatch: Dispatch;
}

const mapDiceToDiceDisplay = (dice: Dice, index: number, onRollDiceClicked: (index: number) => void) => {
	const rolled = !!dice.currentFaceIndex;
	const diceFace = dice.currentFaceIndex ? dice.faces[dice.currentFaceIndex] : dice.faces[0];
	return (
		<Grid item xs={2} key={index !== undefined ? `diceDisplay_${index}` : undefined}>
			<DiceDisplay color={dice.color} rolled={rolled} action={diceFace.action} value={diceFace.value} rollDice={() => onRollDiceClicked(index)} />
		</Grid>
	);
};

export const PlayerDisplay: React.FC<PlayerDisplayProps> = (props: PlayerDisplayProps) => {
	const onRollDiceClicked = (index: number) => {
		props.dispatch(rollDice({ playerIndex: props.playerIndex, diceIndex: index }));
	};

	const onRollAllDiceClicked = () => {
		props.dispatch(rollAllDice({ playerIndex: props.playerIndex }));
	};

	const diceDisplays = props.player.dice.map((dice: Dice, index: number) => mapDiceToDiceDisplay(dice, index, onRollDiceClicked));
	return (
		<Container>
			<Grid container spacing={2}>
				<Grid item xs={12}>
					<Typography variant="h5">{props.player.name}</Typography>
				</Grid>
				<Grid item xs={12}>
					<HandDisplay
						hand={props.player.hand}
						acquireClue={(investigatedLeadIndex: number) =>
							props.dispatch(acquireClue({ playerIndex: props.playerIndex, leadIndex: investigatedLeadIndex }))
						}
					/>
				</Grid>
				<Grid item xs={12}>
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
