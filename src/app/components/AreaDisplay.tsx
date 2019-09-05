import Area from '../models/Area';
import React from 'react';
import { MenuItem, Select } from '@material-ui/core';
import { setActiveArea } from '../state/game';
import { Dispatch } from 'redux';

export interface AreaDisplayProps {
	activeAreaIndex: number;
	areas: Area[];
	dispatch: Dispatch;
}

const onActiveAreaChanged = (
	event: React.ChangeEvent<{
		name?: string | undefined;
		value: unknown;
	}>,
	dispatch: Dispatch
) => {
	if (typeof event.target.value === 'number') {
		dispatch(setActiveArea(event.target.value as number));
	} else {
		console.log(`Unexpected type for active area value (expecting 'number'): ${typeof event.target.value}`);
	}
};

const AreaDisplay: React.StatelessComponent<AreaDisplayProps> = (props: AreaDisplayProps) => {
	const areaMenuItems = props.areas.map((area: Area, index: number) => {
		return (
			<MenuItem key={`area_${index}_${area.name}`} value={index}>
				{area.name}
			</MenuItem>
		);
	});

	return (
		<Select value={props.activeAreaIndex} onChange={(event, _) => onActiveAreaChanged(event, props.dispatch)}>
			{areaMenuItems}
		</Select>
	);
};

export default AreaDisplay;
