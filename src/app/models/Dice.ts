import { DiceFace } from './DiceFace';

export type DiceColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'teal' | 'white';
export interface Dice {
	color: DiceColor;
	faces: DiceFace[];
	currentFaceIndex?: number;
}

export const getDisplayColorForDiceColor = (diceColor: DiceColor): string => {
	switch (diceColor) {
		case 'blue':
			return '#0059b3';
		case 'green':
			return '#39ac39';
		case 'orange':
			return '#ff8000';
		case 'purple':
			return '#5933cc';
		case 'red':
			return '#e61919';
		case 'teal':
			return '#00b386';
		case 'white':
			return '#e6e6e6';
		case 'yellow':
			return '#e6e600';
	}
};
