import React from 'react';
import { Typography, Grid, Card, CardContent, CardActions, Button } from '@material-ui/core';
import Visibility from '@material-ui/icons/Visibility';
import { Lead } from '../models/Lead';

export interface LeadDisplayProps {
	leads: Lead[];
	investigateLead: (leadId: number) => void;
}

const LeadsDisplay: React.FC<LeadDisplayProps> = (props: LeadDisplayProps) => {
	return (
		<Grid container spacing={2}>
			{props.leads.map((lead: Lead) => {
				return (
					<Grid item xs={3} key={`lead_${lead.id}`}>
						<Card>
							<CardContent>
								<Grid container>
									<Grid item xs={2}>
										<Visibility />
									</Grid>
									<Grid item xs={2}>
										<Typography align="right">{lead.investigationCost}</Typography>
									</Grid>
								</Grid>
							</CardContent>
							<CardActions>
								<Button onClick={_ => props.investigateLead(lead.id)}>{'Investigate Lead'}</Button>
							</CardActions>
						</Card>
					</Grid>
				);
			})}
		</Grid>
	);
};

export default LeadsDisplay;
