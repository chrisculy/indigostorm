import InvestigationCost from "./InvestigationCost";

export default interface PointOfInterest {
  id: number;
  type?: string;
  observationCost: number;
  investigationCosts: InvestigationCost[];
  description: string;
}
