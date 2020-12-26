import { Episode } from '../models/Episode';

export const Episode5: Episode = {
	name: 'Episode 5: Rescue Agent Dawson',
	events: [
		{
			description:
				'You hear a click as a thin wire snaps. You notice explosives around the base and a timer that momentarily reads 30:00 before it starts counting down.',
		},
		{
			description: 'The timer reads 25:00.',
		},
		{
			description: 'The timer reads 20:00.',
		},
		{
			description: 'The timer reads 15:00.',
		},
		{
			description: 'The timer reads 10:00.',
		},
		{
			description: 'The timer reads 5:00.',
		},
		{
			description: 'The base explodes, killing your entire team.',
		},
	],
	mission: {
		description:
			'Infiltrate the base safely, gather information on the group, and rescue Agent Dawson. Traps are highly probable. Hidden information and electronic records, possibly encrypted, are also very likely. If possible, gain any background information on the group that you can.',
		primaryObjective: '1 or more clues of type A, and 1 clue of type B.',
		secondaryObjective: 'clues of type C',
	},
	leads: [
		{
			id: 1,
			investigationCost: 0,
			clueCosts: ['none'],
			description: 'Here and there items lay haphazardly, a conspicuous tell of a hurried exit. Activate the event deck.',
		},
		{
			id: 2,
			investigationCost: 6,
			clueCosts: ['search'],
			description: 'You find a piece of paper torn from the pages of a comic book.',
		},
		{
			id: 3,
			type: 'A',
			investigationCost: 4,
			clueCosts: ['hack', 'hack', 'hack'],
			description: 'An encrypted file contains the schematics for a building.',
		},
		{
			id: 4,
			type: 'C',
			investigationCost: 2,
			clueCosts: ['search', 'wild'],
			description: 'You find the name "Sanford" written on a scrap of paper.',
		},
		{
			id: 5,
			type: 'A',
			investigationCost: 3,
			clueCosts: ['hack', 'search'],
			description: 'You find a portable drive whose wires have been damaged, but the rest appears intact.',
		},
		{
			id: 6,
			type: 'C',
			investigationCost: 3,
			clueCosts: ['search'],
			description: 'You find a standard issue army tactical knife blade.',
		},
		{
			id: 7,
			type: 'C',
			investigationCost: 0,
			clueCosts: ['none'],
			description: 'There is an air of precision to the layout of the base, reminiscent of an institution of some kind...',
		},
		{
			id: 8,
			type: 'C',
			investigationCost: 2,
			clueCosts: ['search'],
			description: "The explosives' wiring appears abnormal, so you take a picture for future reference.",
		},
		{
			id: 9,
			type: 'B',
			investigationCost: 2,
			clueCosts: ['talk', 'talk'],
			description: 'Agent Dawson tells you of a planned bombing that the group mentioned before they hurriedly fled the base.',
		},
		{
			id: 10,
			type: 'C',
			investigationCost: 7,
			clueCosts: ['search', 'wild', 'wild'],
			description: 'You find a blood splatter and take a sample for testing.',
		},
		{
			id: 11,
			investigationCost: 0,
			clueCosts: ['type:B', 'special:allPlayers'],
			description: 'You escape with Agent Dawson just as the house explodes behind you. Mission accomplished!',
		},
	],
	map: {
		width: 720,
		height: 1080,
		backgroundColor: '#dfdfec',
		areas: [
			{
				name: 'A',
				x: 0,
				y: 2,
				width: 360,
				height: 360,
				image: 'area_a.png',
				pois: [
					{
						x: 188,
						y: 0,
						destinationArea: 'B',
						leadId: 1,
					},
				],
			},
			{
				name: 'B',
				x: 0,
				y: 1,
				width: 360,
				height: 360,
				image: 'area_b.png',
				pois: [
					// moves
					{
						x: 188,
						y: 300,
						destinationArea: 'A',
					},
					{
						x: 340,
						y: 150,
						destinationArea: 'C',
					},
					// leads
					{
						x: 100,
						y: 224,
						leadId: 2,
					},
					{
						x: 314,
						y: 266,
						leadId: 3,
					},
					{
						x: 180,
						y: 110,
						leadId: 4,
					},
				],
			},
			{
				name: 'C',
				x: 1,
				y: 1,
				width: 360,
				height: 360,
				image: 'area_c.png',
				pois: [
					// moves
					{
						x: 20,
						y: 150,
						destinationArea: 'B',
					},
					{
						x: 220,
						y: 0,
						destinationArea: 'D',
						leadId: 7,
					},
					// leads
					{
						x: 154,
						y: 212,
						leadId: 5,
					},
					{
						x: 284,
						y: 80,
						leadId: 6,
					},
				],
			},
			{
				name: 'D',
				x: 1,
				y: 0,
				width: 360,
				height: 360,
				image: 'area_d.png',
				pois: [
					// moves
					{
						x: 220,
						y: 300,
						destinationArea: 'C',
					},
					{
						x: 30,
						y: 140,
						destinationArea: 'E',
					},
					// leads
					{
						x: 88,
						y: 270,
						leadId: 8,
					},
					{
						x: 90,
						y: 110,
						leadId: 9,
					},
				],
			},
			{
				name: 'E',
				x: 0,
				y: 0,
				width: 360,
				height: 360,
				image: 'area_e.png',
				pois: [
					// moves
					{
						x: 320,
						y: 140,
						destinationArea: 'D',
					},
					// leads
					{
						x: 160,
						y: 100,
						leadId: 10,
					},
					{
						x: 140,
						y: 0,
						leadId: 11,
					},
				],
			},
		],
	},
};
