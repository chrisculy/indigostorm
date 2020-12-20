import React from 'react';
import { Typography, Grid, Card, CardContent, CardActions, Button } from '@material-ui/core';
import Visibility from '@material-ui/icons/Visibility';
import { PointOfInterest } from '../models/PointOfInterest';

export interface PointsOfInterestDisplayProps {
	pointsOfInterest: PointOfInterest[];
	observePoi: (poiId: number) => void;
}

const PointsOfInterestDisplay: React.StatelessComponent<PointsOfInterestDisplayProps> = (props: PointsOfInterestDisplayProps) => {
	return (
		<Grid container spacing={2}>
			{props.pointsOfInterest.map((pointOfInterest: PointOfInterest) => {
				return (
					<Grid item xs={3} key={`poi_${pointOfInterest.id}`}>
						<Card>
							<CardContent>
								<Grid container>
									<Grid item xs={2}>
										<Visibility />
									</Grid>
									<Grid item xs={2}>
										<Typography align="right">{pointOfInterest.observationCost}</Typography>
									</Grid>
								</Grid>
							</CardContent>
							<CardActions>
								<Button onClick={_ => props.observePoi(pointOfInterest.id)}>{'Observe'}</Button>
							</CardActions>
						</Card>
					</Grid>
				);
			})}
		</Grid>
	);
};

export default PointsOfInterestDisplay;
