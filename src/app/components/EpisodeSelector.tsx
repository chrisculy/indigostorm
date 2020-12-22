import React, { useState } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { Select, MenuItem, Grid, Button } from '@material-ui/core';
import { Episodes } from '../episodes/episodes';
import { Episode } from '../models/Episode';
import { playEpisode } from '../state/game';
import { Characters } from '../models/GameData';

interface EpisodeSelectorProps {
	dispatch: Dispatch;
}

const EpisodeSelector: React.FC<EpisodeSelectorProps> = (props: EpisodeSelectorProps) => {
	const episodeMenuItems = Episodes.map((episode: Episode, index: number) => {
		return (
			<MenuItem key={episode.name} value={index}>
				{episode.name}
			</MenuItem>
		);
	});

	const characterMenuItems = Characters.map((character: string) => {
		return (
			<MenuItem key={character} value={character}>
				{character}
			</MenuItem>
		);
	});

	const [episodeIndex, setEpisodeIndex] = useState(0);
	const [characterOne, setCharacterOne] = useState(Characters[0]);
	const [characterTwo, setCharacterTwo] = useState(Characters[1]);

	return (
		<Grid container direction="row" justify="center" alignItems="center" spacing={4}>
			<Grid item>
				<Select
					value={episodeIndex}
					onChange={(event, _) => setEpisodeIndex(event.target.value as number)}
					inputProps={{
						name: 'episode',
						id: 'episode-selector',
					}}
				>
					{episodeMenuItems}
				</Select>
			</Grid>
			<Grid item>
				<Select
					value={characterOne}
					onChange={(event, _) => setCharacterOne(event.target.value as string)}
					inputProps={{
						name: 'characterOne',
						id: 'characterOne-selector',
					}}
				>
					{characterMenuItems}
				</Select>
			</Grid>
			<Grid item>
				<Select
					value={characterTwo}
					onChange={(event, _) => setCharacterTwo(event.target.value as string)}
					inputProps={{
						name: 'characterTwo',
						id: 'characterTwo-selector',
					}}
				>
					{characterMenuItems}
				</Select>
			</Grid>
			<Grid item>
				<Button variant="contained" color="primary" onClick={() => props.dispatch(playEpisode({ episodeIndex, characterOne, characterTwo }))}>
					{'Play Episode'}
				</Button>
			</Grid>
		</Grid>
	);
};

const mapStateToProps = () => {
	return {};
};

const mapDispatchToProps = (dispatch: Dispatch) => {
	return {
		dispatch,
	};
};

const ConnectedEpisodeSelector = connect(
	mapStateToProps,
	mapDispatchToProps
)(EpisodeSelector);

export { ConnectedEpisodeSelector as EpisodeSelector };
