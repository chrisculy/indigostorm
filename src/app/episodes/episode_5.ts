import Episode from '../models/Episode';

const Episode5: Episode = {
    "name": "Episode 5: Rescue Agent Dawson",
    "events": [{
            "description": "You hear a click as a thin wire snaps. You notice explosives around the base and a timer that momentarily reads 30:00 before it starts counting down."
        }, {
            "description": "The timer reads 25:00."
        }, {
            "description": "The timer reads 20:00."
        }, {
            "description": "The timer reads 15:00."
        }, {
            "description": "The timer reads 10:00."
        }, {
            "description": "The timer reads 5:00."
        }, {
            "description": "The base explodes, killing your entire team."
        }
    ],
    "mission": {
        "description": "Infiltrate the base safely, gather information on the group, and rescue Agent Dawson. Traps are highly probable. Hidden information and electronic records, possibly encrypted, are also very likely. If possible, gain any background information on the group that you can.",
        "primaryObjective": "1 or more clues of type A, and 1 clue of type B.",
        "auxiliaryObjective": "clues of type C"
    },
    "pointsOfInterest": [{
        "id": 1,
        "observationCost": 0,
        "investigationCosts": [
            "none"
        ],
        "description": "Here and there items lay haphazardly, a conspicuous tell of a hurried exit. Activate the event deck."
    }, {
        "id": 2,
        "observationCost": 6,
        "investigationCosts": [
            "search"
        ],
        "description": "You find a piece of paper torn from the pages of a comic book."
    }, {
        "id": 3,
        "type": "A",
        "observationCost": 4,
        "investigationCosts": [
            "hack",
            "hack",
            "hack"
        ],
        "description": "An encrypted file contains the schematics for a building."
    }, {
        "id": 4,
        "type": "C",
        "observationCost": 2,
        "investigationCosts": [
            "search",
            "wild"
        ],
        "description": "You find the name \"Sanford\" written on a scrap of paper."
    }, {
        "id": 5,
        "type": "A",
        "observationCost": 3,
        "investigationCosts": [
            "hack",
            "search"
        ],
        "description": "You find a portable drive whose wires have been damaged, but the rest appears intact."
    }, {
        "id": 6,
        "type": "C",
        "observationCost": 3,
        "investigationCosts": [
            "search"
        ],
        "description": "You find a standard issue army tactical knife blade."
    }, {
        "id": 7,
        "type": "C",
        "observationCost": 0,
        "investigationCosts": [
            "none"
        ],
        "description": "There is an air of precision to the layout of the base, reminiscent of an institution of some kind..."
    }, {
        "id": 8,
        "type": "C",
        "observationCost": 2,
        "investigationCosts": [
            "search"
        ],
        "description": "The explosives' wiring appears abnormal, so you take a picture for future reference."
    }, {
        "id": 9,
        "type": "B",
        "observationCost": 2,
        "investigationCosts": [
            "talk",
            "talk"
        ],
        "description": "Agent Dawson tells you of a planned bombing that the group mentioned before they hurriedly fled the base."
    }, {
        "id": 10,
        "type": "C",
        "observationCost": 7,
        "investigationCosts": [
            "search",
            "wild",
            "wild"
        ],
        "description": "You find a blood splatter and take a sample for testing."
    }, {
        "id": 11,
        "observationCost": 0,
        "investigationCosts": [
            "type:B",
            "special:allPlayers"
        ],
        "description": "You escape with Agent Dawson just as the house explodes behind you. Mission accomplished!"
    }],
    "areas": [{
        "name": "A",
        "adjacentTo": [{
            "area": "B",
            "direction": "south"
        }],
        "pointOfInterestIds": [
            1
        ]
    }, {
        "name": "B",
        "adjacentTo": [{
            "area": "A",
            "direction": "north"
        }, {
            "area": "C",
            "direction": "east"
        }],
        "pointOfInterestIds": [
            2,
            3,
            4
        ]
    }, {
        "name": "C",
        "adjacentTo": [{
            "area": "B",
            "direction": "west"
        }, {
            "area": "D",
            "direction": "south"
        }],
        "pointOfInterestIds": [
            5,
            6,
            7
        ]
    }, {
        "name": "D",
        "adjacentTo": [{
            "area": "C",
            "direction": "north"
        }, {
            "area": "E",
            "direction": "west"
        }],
        "pointOfInterestIds": [
            8,
            9
        ]
    }, {
        "name": "E",
        "adjacentTo": [{
            "area": "D",
            "direction": "east"
        }],
        "pointOfInterestIds": [
            10,
            11
        ]
    }]
};

export default Episode5;
