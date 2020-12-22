import React from 'react';
import { Typography, Grid, Card, CardContent, Button, CardActions, Container } from '@material-ui/core';
import { PlayerHand } from '../state/game';
import { Lead } from '../models/Lead';
import { ClueCost } from '../models/ClueCost';

interface HandDisplayProps {
	hand: PlayerHand;
	acquireClue: (investigatedLeadIndex: number) => void;
}

const renderLeadType = (lead: Lead) => {
	return (
		<Typography variant="body2" align="right">
			{lead.type ? lead.type : '\u00a0'}
		</Typography>
	);
};

const renderInvestigatedLead = (lead: Lead, leadIndex: number, acquireClue: (investigatedLeadIndex: number) => void) => {
	return (
		<Grid item xs={3} key={`lead_${lead.id}`}>
			<Card>
				<CardContent>
					<Grid container spacing={1}>
						<Grid item xs={12}>
							{renderLeadType(lead)}
						</Grid>
						{lead.clueCosts.map((cost: ClueCost, index: number) => {
							return (
								<Grid key={`lead_${lead.id}_clue_cost_${index}`} item xs={3}>
									{cost !== 'none' ? cost : '\u00a0'}
								</Grid>
							);
						})}
					</Grid>
				</CardContent>
				<CardActions>
					<Button onClick={() => acquireClue(leadIndex)}>{'Acquire Clue'}</Button>
				</CardActions>
			</Card>
		</Grid>
	);
};

const renderClue = (lead: Lead) => {
	return (
		<Grid item xs={12} key={`lead_${lead.id}`}>
			<Card key={`lead_${lead.id}`}>
				<CardContent>
					<Grid container>
						<Grid item xs={12}>
							{renderLeadType(lead)}
						</Grid>
						<Grid item xs={12}>
							<Typography variant="body1">{lead.description}</Typography>
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
						{'Observed leads'}
					</Typography>
				</Grid>
				{props.hand.leads.map((lead: Lead, index: number) => renderInvestigatedLead(lead, index, props.acquireClue))}
			</Grid>
			<Grid container spacing={2}>
				<Grid item xs={12}>
					<Typography variant="body2" color="textSecondary">
						{'Investigated leads'}
					</Typography>
				</Grid>
				{props.hand.clues.map(renderClue)}
			</Grid>
		</Container>
	);
};
