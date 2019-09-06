import React from 'react';
import PointOfInterest from '../models/PointOfInterest';
import { Typography, Grid, Card, CardContent, CardActions, Button } from '@material-ui/core';
import Visibility from '@material-ui/icons/Visibility';

export interface PointsOfInterestDisplayProps {
	pointsOfInterest: PointOfInterest[];
}

const PointsOfInterestDisplay: React.StatelessComponent<PointsOfInterestDisplayProps> = (props: PointsOfInterestDisplayProps) => {
	return (
		<Grid container>
			{props.pointsOfInterest.map((pointOfInterest: PointOfInterest, index: number) => {
				const typeDisplay = pointOfInterest.type ? <Typography variant="body2" align="right">{pointOfInterest.type}</Typography> : null;
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
									<Grid item xs={8}>
										{typeDisplay}
									</Grid>
								</Grid>
							</CardContent>
							<CardActions>
								<Button>{'Observe'}</Button>
							</CardActions>
						</Card>
					</Grid>
				);
			})}
		</Grid>
	);
};

export default PointsOfInterestDisplay;
