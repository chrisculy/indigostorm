import React from 'react';
import { RiHandCoinFill } from 'react-icons/ri';
import { Button, Grid, Typography } from '@material-ui/core';
import { Action } from '../models/Action';
import { IconDefuse, IconHack, IconNone, IconSearch, IconTalk, IconTreat, IconWild } from './Icons';
import { DiceFace } from '../models/DiceFace';
import { DiceColor, getDisplayColorForDiceColor } from '../models/Dice';
import { iconStyle } from '../utility';

interface DiceDisplayProps extends DiceFace {
	color: DiceColor;
	rolled: boolean;
	rollDice: () => void;
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
	switch (actionType) {
		case 'defuse':
			return <IconDefuse style={iconStyle} />;
		case 'hack':
			return <IconHack style={iconStyle} />;
		case 'search':
			return <IconSearch style={iconStyle} />;
		case 'talk':
			return <IconTalk style={iconStyle} />;
		case 'treat':
			return <IconTreat style={iconStyle} />;
		case 'wild':
			return <IconWild style={iconStyle} />;
		case 'none':
			return <IconNone style={iconStyle} />;
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
	const borderRadius = '4pt';
	const width = '5em';
	const style = {
		backgroundColor: getDisplayColorForDiceColor(props.color),
		color: getForegroundColorForDiceColor(props.color),
		width: width,
		height: '6em',
		borderRadius: borderRadius,
	};
	return (
		<Grid container spacing={1} style={{ width: width }}>
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
			<Grid container spacing={1} style={{ width: width }}>
				<Grid item xs={12}>
					<Button onClick={() => props.rollDice()} style={{ width: '100%' }}>
						<RiHandCoinFill style={iconStyle} />
					</Button>
				</Grid>
			</Grid>
		</Grid>
	);
};
