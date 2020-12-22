import { Grid } from '@material-ui/core';
import React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { Player } from '../state/game';
import { ReduxStore } from '../state/store';
import { PlayerDisplay } from './PlayerDisplay';

interface PlayersProps {
	players: Player[];
	dispatch: Dispatch;
}

const PlayersDisplay: React.FC<PlayersProps> = props => {
	const playerDisplays = props.players.map((player: Player, index: number) => {
		return (
			<Grid item xs={6} key={`player_display_${index}`}>
				<PlayerDisplay playerIndex={index} player={player} dispatch={props.dispatch} />
			</Grid>
		);
	});

	return (
		<Grid container spacing={4}>
			{playerDisplays}
		</Grid>
	);
};

const mapStateToProps = (store: ReduxStore) => {
	return {
		players: [...store.game.players],
	};
};

const mapDispatchToProps = (dispatch: Dispatch) => {
	return {
		dispatch,
	};
};

const ConnectedPlayersDisplay = connect(
	mapStateToProps,
	mapDispatchToProps
)(PlayersDisplay);

export { ConnectedPlayersDisplay as PlayersDisplay };
