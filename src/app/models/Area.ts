import { AreaPointOfInterest } from './AreaPointOfInterest';

export interface Area {
	name: string;
	x: number;
	y: number;
	image: string;
	width: number;
	height: number;
	pois: AreaPointOfInterest[];
}
