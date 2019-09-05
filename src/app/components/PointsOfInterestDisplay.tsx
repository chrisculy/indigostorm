import React from 'react';
import PointOfInterest from '../models/PointOfInterest';
import { List, ListItem, ListItemText } from '@material-ui/core';

export interface PointsOfInterestDisplayProps {
	pointsOfInterest: PointOfInterest[];
}

const PointsOfInterestDisplay: React.StatelessComponent<PointsOfInterestDisplayProps> = (props: PointsOfInterestDisplayProps) => {
	return (
		<List>
			{props.pointsOfInterest.map((pointOfInterest: PointOfInterest, index: number) => {
				return (
					<ListItem key={pointOfInterest.id}>
						<ListItemText>{`ID: ${pointOfInterest.id}\nType:${pointOfInterest.type}\nObservation Cost:${pointOfInterest.observationCost}`}</ListItemText>
					</ListItem>
				);
			})}
		</List>
	);
};

export default PointsOfInterestDisplay;
