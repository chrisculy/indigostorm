import React from 'react';
import { Provider } from 'react-redux';
import { Typography, Container } from '@material-ui/core';
import { EpisodeSelector } from './components/EpisodeSelector';
import { EpisodeDisplay } from './components/EpisodeDisplay';
import { store } from './state/store';
import { PlayersDisplay } from './components/PlayersDisplay';

const App: React.FC = () => {
	return (
		<Provider store={store}>
			<Container>
				<Typography variant="h4">{'Indigo Storm'}</Typography>
				<EpisodeSelector />
				<EpisodeDisplay />
				<PlayersDisplay />
			</Container>
		</Provider>
	);
};

export default App;
