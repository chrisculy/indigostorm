import React from 'react';
import { Typography, Grid, Card, CardHeader, CardContent, Button, CardActions, Container } from '@material-ui/core';
import { PlayerHand } from '../state/store';
import PointOfInterest from '../models/PointOfInterest';
import InvestigationCost from '../models/InvestigationCost';

interface HandDisplayProps {
	hand: PlayerHand;
	investigatePoi: (observedPoiIndex: number) => void;
}

const renderObservedPoi = (poi: PointOfInterest, poiIndex: number, investigatePoi: (observedPoiIndex: number) => void) => {
	const typeDisplay = poi.type ? (
		<Typography variant="body2" align="right">
			{poi.type}
		</Typography>
	) : null;
	return (
		<Card>
			<CardContent>
				<Grid container>
					<Grid item xs={12}>
						{typeDisplay}
					</Grid>
					{poi.investigationCosts.map((cost: InvestigationCost, index: number) => {
						return (
							<Grid key={`poi_${poi.id}_investigation_cost_${index}`} item xs={3}>
								{cost}
							</Grid>
						);
					})}
				</Grid>
			</CardContent>
			<CardActions>
				<Button onClick={() => investigatePoi(poiIndex)}>{'Investigate'}</Button>
			</CardActions>
		</Card>
	);
};

const renderInvestigatedPoi = (poi: PointOfInterest) => {
	const typeDisplay = poi.type ? (
		<Typography variant="body2" align="right">
			{poi.type}
		</Typography>
	) : null;
	return (
		<Card>
			<CardContent>
				<Grid container>
					<Grid item xs={12}>
						{typeDisplay}
					</Grid>
					<Grid item xs={12}>
						<Typography variant="body1">{poi.description}</Typography>
					</Grid>
				</Grid>
			</CardContent>
		</Card>
	);
};

const HandDisplay: React.StatelessComponent<HandDisplayProps> = (props: HandDisplayProps) => {
	return (
		<Container>
			<Grid container>
				<Grid item xs={12}>
					<Typography variant="body2" color="textSecondary">
						{'Observed POIs'}
					</Typography>
				</Grid>
				{props.hand.observed.map((poi: PointOfInterest, index: number) => renderObservedPoi(poi, index, props.investigatePoi))}
			</Grid>
			<Grid container>
				<Grid item xs={12}>
					<Typography variant="body2" color="textSecondary">
						{'Investigated POIs'}
					</Typography>
				</Grid>
				{props.hand.investigated.map(renderInvestigatedPoi)}
			</Grid>
		</Container>
	);
};

export default HandDisplay;
