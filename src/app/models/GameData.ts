import * as GameData from '../resources/data.json';
import { Action } from './Action';
import { Dice, DiceColor } from './Dice';

export const getInitialDiceForCharacter = (name: string): Dice[] => {
	if (!GameData.characters.some(x => x.name === name)) {
		throw new Error(`Invalid character name ${name}; no such character exists.`);
	}

	const character = GameData.characters.filter(x => x.name === name)[0];
	return character.dice.map(characterDice => {
		if (!GameData.dice.some(x => x.name === characterDice)) {
			throw new Error(`Bad game data; character ${name} references dice name ${characterDice} which does not exist.`);
		}

		const dice = GameData.dice.filter(x => x.name === characterDice)[0];
		return {
			color: dice.color as DiceColor,
			faces: dice.faces.map(face => {
				return { action: face.action as Action, value: face.value };
			}),
			currentFaceIndex: Math.floor(Math.random() * Math.floor(6)),
		};
	});
};
