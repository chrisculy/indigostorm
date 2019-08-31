import AreaAdjacency from "./AreaAdjacency";

export default interface Area {
  name: string,
  adjacentTo: AreaAdjacency[];
  pointOfInterestIds: number[];
}
