import React from 'react';
import { Grid, Typography } from '@material-ui/core';
import { Action } from '../models/Action';
import { IconDefuse, IconHack, IconNone, IconSearch, IconTalk, IconTreat, IconWild } from './Icons';
import { DiceFace } from '../models/DiceFace';
import { DiceColor, getDisplayColorForDiceColor } from '../models/Dice';

interface DiceDisplayProps extends DiceFace {
	color: DiceColor;
	rolled: boolean;
}

const getForegroundColorForDiceColor = (diceColor: DiceColor) => {
	switch (diceColor) {
		case 'blue':
		case 'green':
		case 'orange':
		case 'purple':
		case 'red':
		case 'teal':
			return '#e6e6e6';
		case 'white':
		case 'yellow':
			return '#262626';
	}
};

const getIconForActionType = (actionType: Action): JSX.Element => {
	const scale = '2em';
	const style = { width: scale, height: scale };
	switch (actionType) {
		case 'defuse':
			return <IconDefuse style={style} />;
		case 'hack':
			return <IconHack style={style} />;
		case 'search':
			return <IconSearch style={style} />;
		case 'talk':
			return <IconTalk style={style} />;
		case 'treat':
			return <IconTreat style={style} />;
		case 'wild':
			return <IconWild style={style} />;
		case 'none':
			return <IconNone style={style} />;
		default:
			throw new Error(`Invalid action type ${actionType}!`);
	}
};

const getTooltipforActionType = (actionType: Action): string => {
	switch (actionType) {
		case 'defuse':
			return 'Defuse';
		case 'hack':
			return 'Hack';
		case 'search':
			return 'Search';
		case 'talk':
			return 'Talk';
		case 'treat':
			return 'Heal';
		case 'wild':
			return 'Wild';
		case 'none':
			return 'No Action';
		default:
			throw new Error(`Invalid action type ${actionType}!`);
	}
};

export const DiceDisplay: React.FC<DiceDisplayProps> = (props: DiceDisplayProps) => {
	const icon = getIconForActionType(props.action);
	const diceExtent = '64pt';
	const borderRadius = '4pt';
	const style = {
		backgroundColor: getDisplayColorForDiceColor(props.color),
		color: getForegroundColorForDiceColor(props.color),
		width: diceExtent,
		height: diceExtent,
		borderRadius: borderRadius,
	};
	return (
		<Grid container spacing={1} className={`${props.rolled ? '' : 'disabled'}`} style={style}>
			<Grid item xs={6}>
				<Typography variant="h5">{props.value}</Typography>
			</Grid>
			<Grid item xs={6} />
			<Grid item xs={6} />
			<Grid item xs={6} title={getTooltipforActionType(props.action)}>
				{icon}
			</Grid>
		</Grid>
	);
};
