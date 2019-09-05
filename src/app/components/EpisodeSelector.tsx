import React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { Select, MenuItem, Grid, Button } from '@material-ui/core';
import Episodes from '../episodes/episodes';
import Episode from '../models/Episode';
import { playEpisode } from '../state/game';

interface EpisodeSelectorProps {
	dispatch: Dispatch;
}

interface EpisodeSelectorState {
	episodeIndex: number;
}

class EpisodeSelector extends React.Component<EpisodeSelectorProps, EpisodeSelectorState> {
	constructor(props: EpisodeSelectorProps) {
		super(props);

		this.state = {
			episodeIndex: 0,
		};
	}

	onEpisodeChanged(
		event: React.ChangeEvent<{
			name?: string | undefined;
			value: unknown;
		}>,
		_: React.ReactNode
	) {
		const episodeIndex: number = event.target.value as number;
		this.setState({ ...this.state, episodeIndex });
	}

	render() {
		const episodeMenuItems = Episodes.map((episode: Episode, index: number) => {
			return (
				<MenuItem key={episode.name} value={index}>
					{episode.name}
				</MenuItem>
			);
		});

		return (
			<Grid container direction="row" justify="center" alignItems="center">
				<Grid item>
					<Select
						value={this.state.episodeIndex}
						onChange={(event, child) => this.onEpisodeChanged(event, child)}
						inputProps={{
							name: 'episode',
							id: 'episode-selector',
						}}
					>
						{episodeMenuItems}
					</Select>
				</Grid>
				<Grid item>
					<Button variant="contained" color="primary" onClick={() => this.props.dispatch(playEpisode(this.state.episodeIndex))}>
						Play Episode
					</Button>
				</Grid>
			</Grid>
		);
	}
}

const mapStateToProps = () => {
	return {};
};

const mapDispatchToProps = (dispatch: Dispatch) => {
	return {
		dispatch
	};
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(EpisodeSelector);
