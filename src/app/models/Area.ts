import { AreaAdjacency } from './AreaAdjacency';

export interface Area {
	name: string;
	adjacentTo: AreaAdjacency[];
	pointOfInterestIds: number[];
}
