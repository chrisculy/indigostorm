import { ClueCost } from './ClueCost';

export interface Lead {
	id: number;
	type?: string;
	investigationCost: number;
	clueCosts: ClueCost[];
	description: string;
}
