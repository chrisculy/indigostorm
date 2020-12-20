import React from 'react';
import { Typography, Grid, Card, CardContent, Button, CardActions, Container } from '@material-ui/core';
import { PlayerHand } from '../state/game';
import { PointOfInterest } from '../models/PointOfInterest';
import { InvestigationCost } from '../models/InvestigationCost';

interface HandDisplayProps {
	hand: PlayerHand;
	investigatePoi: (observedPoiIndex: number) => void;
}

const renderPoiType = (poi: PointOfInterest) => {
	return (
		<Typography variant="body2" align="right">
			{poi.type ? poi.type : '\u00a0'}
		</Typography>
	);
};

const renderObservedPoi = (poi: PointOfInterest, poiIndex: number, investigatePoi: (observedPoiIndex: number) => void) => {
	return (
		<Grid item xs={3} key={`poi_${poi.id}`}>
			<Card>
				<CardContent>
					<Grid container spacing={1}>
						<Grid item xs={12}>
							{renderPoiType(poi)}
						</Grid>
						{poi.investigationCosts.map((cost: InvestigationCost, index: number) => {
							return (
								<Grid key={`poi_${poi.id}_investigation_cost_${index}`} item xs={3}>
									{cost !== 'none' ? cost : '\u00a0'}
								</Grid>
							);
						})}
					</Grid>
				</CardContent>
				<CardActions>
					<Button onClick={() => investigatePoi(poiIndex)}>{'Investigate'}</Button>
				</CardActions>
			</Card>
		</Grid>
	);
};

const renderInvestigatedPoi = (poi: PointOfInterest) => {
	return (
		<Grid item xs={12} key={`poi_${poi.id}`}>
			<Card key={`poi_${poi.id}`}>
				<CardContent>
					<Grid container>
						<Grid item xs={12}>
							{renderPoiType(poi)}
						</Grid>
						<Grid item xs={12}>
							<Typography variant="body1">{poi.description}</Typography>
						</Grid>
					</Grid>
				</CardContent>
			</Card>
		</Grid>
	);
};

export const HandDisplay: React.FC<HandDisplayProps> = (props: HandDisplayProps) => {
	return (
		<Container>
			<Grid container spacing={2}>
				<Grid item xs={12}>
					<Typography variant="body2" color="textSecondary">
						{'Observed POIs'}
					</Typography>
				</Grid>
				{props.hand.observed.map((poi: PointOfInterest, index: number) => renderObservedPoi(poi, index, props.investigatePoi))}
			</Grid>
			<Grid container spacing={2}>
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
