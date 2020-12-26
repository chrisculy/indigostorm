import { Area } from './Area';

export interface Map {
	width: number;
	height: number;
	backgroundColor: string;
	areas: Area[];
}
