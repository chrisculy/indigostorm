import React from 'react';
import { Select, MenuItem } from '@material-ui/core';
import Episode from '../models/Episode';
import Episodes from '../episodes/episodes';

interface EpisodeSelectorProps {}

interface EpisodeSelectorState {
	episodeName: string;
}

class EpisodeSelector extends React.Component<EpisodeSelectorProps, EpisodeSelectorState> {
	constructor(props: EpisodeSelectorProps) {
		super(props);

		this.state = {
			episodeName: Episodes[0].name,
		};
	}

	onEpisodeChanged(
		event: React.ChangeEvent<{
			name?: string | undefined;
			value: unknown;
		}>,
		_: React.ReactNode
	) {
		const episode: Episode = Episodes.filter(x => x.name === event.target.value)[0];
		this.setState({ ...this.state, episodeName: episode.name });
		console.log(episode);
	}

	render() {
		const episodeMenuItems = Episodes.map(episode => {
			return (
				<MenuItem key={episode.name} value={episode.name}>
					{episode.name}
				</MenuItem>
			);
		});

		return (
			<Select
				value={this.state.episodeName}
				onChange={(event, child) => this.onEpisodeChanged(event, child)}
				inputProps={{
					name: 'episode',
					id: 'episode-selector',
				}}
			>
				{episodeMenuItems}
			</Select>
		);
	}
}

export default EpisodeSelector;
