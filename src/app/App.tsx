import React from 'react';
import { Typography, Container, Grid, Button } from '@material-ui/core';
import EpisodeSelector from './components/EpisodeSelector';

const App: React.FC = () => {
	return (
		<Container>
			<Typography variant="h4">Indigo Storm</Typography>
			<Grid container direction="row" justify="center" alignItems="center">
				<Grid item>
					<EpisodeSelector />
				</Grid>
				<Grid item>
					<Button variant="contained" color="primary">
						Play Episode
					</Button>
				</Grid>
			</Grid>
		</Container>
	);
};

export default App;
