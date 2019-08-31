import Area from './Area';
import Event from './Event';
import Mission from './Mission';
import PointOfInterest from './PointOfInterest';

export default interface Episode {
  name: string;
  events: Event[];
  mission: Mission;
  pointsOfInterest: PointOfInterest[];
  areas: Area[];
}
