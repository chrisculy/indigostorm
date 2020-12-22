import React, { useState } from 'react';
import { Typography, Grid, Card, CardContent, CardActions, Button, MenuItem, Select } from '@material-ui/core';
import Visibility from '@material-ui/icons/Visibility';
import { Lead } from '../models/Lead';

export interface LeadDisplayProps {
	leads: Lead[];
	characters: string[];
	investigateLead: (playerIndex: number, leadId: number) => void;
}

const LeadsDisplay: React.FC<LeadDisplayProps> = (props: LeadDisplayProps) => {
	const characterMenuItems = props.characters.map((character: string, index: number) => {
		return (
			<MenuItem key={character} value={index}>
				{character}
			</MenuItem>
		);
	});

	const [playerIndex, setPlayerIndex] = useState(0);

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
								<Select
									value={playerIndex}
									onChange={(event, _) => setPlayerIndex(event.target.value as number)}
									inputProps={{
										name: 'player',
										id: 'player-selector',
									}}
								>
									{characterMenuItems}
								</Select>
								<Button onClick={_ => props.investigateLead(playerIndex, lead.id)}>{'Investigate Lead'}</Button>
							</CardActions>
						</Card>
					</Grid>
				);
			})}
		</Grid>
	);
};

export default LeadsDisplay;
