import { Area } from './Area';
import { Event } from './Event';
import { Mission } from './Mission';
import { Lead } from './Lead';

export interface Episode {
	name: string;
	events: Event[];
	mission: Mission;
	leads: Lead[];
	areas: Area[];
}
