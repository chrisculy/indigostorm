import { Event } from './Event';
import { Map } from './Map';
import { Mission } from './Mission';
import { Lead } from './Lead';

export interface Episode {
	name: string;
	events: Event[];
	mission: Mission;
	leads: Lead[];
	map: Map;
}
