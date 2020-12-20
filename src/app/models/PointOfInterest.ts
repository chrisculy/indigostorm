import { InvestigationCost } from './InvestigationCost';

export interface PointOfInterest {
	id: number;
	type?: string;
	observationCost: number;
	investigationCosts: InvestigationCost[];
	description: string;
}
