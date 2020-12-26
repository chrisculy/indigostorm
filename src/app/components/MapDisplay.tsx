import _ from 'lodash';
import React from 'react';
import { Dispatch } from 'redux';
import { Paper, Table, TableBody, TableCell, TableContainer, TableRow } from '@material-ui/core';
import { AreaDisplay } from './AreaDisplay';
import { Map } from '../models/Map';
import { useStyles } from '../styles';
import { Lead } from '../models/Lead';

export interface MapDisplayProps {
	activeAreaIndex: number;
	map: Map;
	leads: Lead[];
	revealedAreas: string[];
	dispatch: Dispatch;
}

const MapDisplay: React.FC<MapDisplayProps> = (props: MapDisplayProps) => {
	const classes = useStyles();

	const xValues = _.uniq(props.map.areas.map(area => area.x));
	const yValues = _.uniq(props.map.areas.map(area => area.y));

	const minX = _.min(xValues) as number;
	const maxX = _.max(xValues) as number;
	const minY = _.min(yValues) as number;
	const maxY = _.max(yValues) as number;

	const mapPadding = 32;
	const mapWidth = props.map.width;
	const mapHeight = props.map.height;
	const rows = _.groupBy(props.map.areas, 'y');
	const tableRows: JSX.Element[] = [];
	for (let y = maxY; y >= minY; y--) {
		const row = rows[y];
		const tableCells: JSX.Element[] = [];
		for (let x = minX; x <= maxX; x++) {
			const area = _.find(row, area => area.x === x);
			const areaExtentsStyle = area
				? {
						minWidth: area.width,
						maxWidth: area.width,
						width: area.width,
						minHeight: area.height,
						maxHeight: area.height,
						height: area.height,
				  }
				: {};

			tableCells.push(
				area ? (
					<TableCell key={`area_${area.x}_${area.y}`} className={`${classes.zeroPadding} ${classes.noBorder}`} style={areaExtentsStyle}>
						<AreaDisplay area={area} leads={props.leads} revealed={props.revealedAreas.some(x => x === area.name)} />
					</TableCell>
				) : (
					<React.Fragment key={`area_${x}_${y}`}></React.Fragment>
				)
			);
		}

		tableRows.push(<TableRow key={`area_y_${y}`}>{tableCells}</TableRow>);
	}

	const tableContainerStyle = { backgroundColor: props.map.backgroundColor, width: mapWidth, height: mapHeight, margin: 'auto', padding: mapPadding };
	return (
		<TableContainer component={Paper} style={tableContainerStyle}>
			<Table style={{ border: '0px' }}>
				<TableBody>{tableRows}</TableBody>
			</Table>
		</TableContainer>
	);
};

export default MapDisplay;
