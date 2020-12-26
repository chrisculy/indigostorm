import React, { CSSProperties } from 'react';
import _ from 'lodash';
import { Button, Typography } from '@material-ui/core';
import { Area } from '../models/Area';
import { Lead } from '../models/Lead';
import { IconMove } from './Icons';
import { useStyles } from '../styles';
import { zeroPad } from '../utility';

interface AreaDisplayProps {
	leads: Lead[];
	area: Area;
	revealed: boolean;
}

const border = 2;
const poiExtents = 36;
const poiExtentsPx = `${poiExtents}px`;
const movementIconExtents = 24;
const movementIconExtentsPx = `${movementIconExtents}px`;
const leadIdFontSize = 12;
const leadIdFontSizePx = `${leadIdFontSize}px`;
const investigationCostColor = '#ec7979';

const createMapPoiDisplay = (
	lead: Lead | undefined,
	destinationArea: string | undefined,
	x: number,
	y: number,
	index: number,
	noPaddingClass: string
) => {
	const poiContainerStyle: CSSProperties = {
		backgroundColor: '#4d4d4dcc',
		minWidth: poiExtentsPx,
		maxWidth: poiExtentsPx,
		width: poiExtentsPx,
		minHeight: poiExtentsPx,
		maxHeight: poiExtentsPx,
		height: poiExtentsPx,
		borderRadius: poiExtentsPx,
		position: 'absolute',
		padding: '0px',
		left: `${x - poiExtents * 0.5}px`,
		bottom: `${y + poiExtents * 0.5}px`,
		zIndex: 2,
		border: `#dfdfdf ${border}px solid`,
	};
	const leadIdStyle: React.CSSProperties = {
		color: '#ffffff',
		position: 'absolute',
		left: `-${(2 * leadIdFontSize) / 3}px`,
		bottom: `-${leadIdFontSize}px`,
		fontWeight: 'bold',
		fontSize: leadIdFontSizePx,
		margin: '0px',
	};
	const content = (() => {
		if (lead && destinationArea) {
			return (
				<div style={{ position: 'relative' }}>
					<IconMove
						style={{
							position: 'absolute',
							color: '#000000cc',
							left: `-${movementIconExtents * 0.5}px`,
							bottom: `-${movementIconExtents * 0.5}px`,
							width: movementIconExtentsPx,
							height: movementIconExtentsPx,
						}}
					/>
					<p style={leadIdStyle}>
						{zeroPad(lead.id)}
						<sup style={{ color: investigationCostColor }}>{lead.investigationCost}</sup>
					</p>
				</div>
			);
		} else if (lead) {
			return (
				<div style={{ position: 'relative' }}>
					<p style={leadIdStyle}>
						{zeroPad(lead.id)}
						<sup style={{ color: investigationCostColor }}>{lead.investigationCost}</sup>
					</p>
				</div>
			);
		} else if (destinationArea) {
			return (
				<div style={{ position: 'relative' }}>
					<IconMove
						style={{
							position: 'absolute',
							color: '#000000cc',
							left: `-${movementIconExtents * 0.5}px`,
							bottom: `-${movementIconExtents * 0.5}px`,
							width: movementIconExtentsPx,
							height: movementIconExtentsPx,
						}}
					/>
				</div>
			);
		} else {
			return null;
		}
	})();

	return (
		<Button key={`poi_${index}`} style={poiContainerStyle}>
			{content}
		</Button>
	);
};

export const AreaDisplay: React.FC<AreaDisplayProps> = (props: AreaDisplayProps): JSX.Element => {
	const classes = useStyles();
	const containerStyle = {
		minWidth: props.area.width,
		maxWidth: props.area.width,
		minHeight: props.area.height,
		maxHeight: props.area.height,
		margin: 0,
	};

	const content = (() => {
		if (props.revealed) {
			return (
				<div style={{ position: 'relative' }}>
					<img width={props.area.width} height={props.area.height} src={props.area.image} alt={`Area ${props.area.name}`} />
					{props.area.pois.map((poi, index) =>
						createMapPoiDisplay(
							poi.leadId ? _.find(props.leads, lead => lead.id === poi.leadId) : undefined,
							poi.destinationArea,
							poi.x,
							poi.y,
							index,
							classes.zeroPadding
						)
					)}
				</div>
			);
		} else {
			return (
				<Typography
					variant="h5"
					style={{ lineHeight: `${props.area.height}px`, textAlign: 'center' as CanvasTextAlign }}
				>{`Area ${props.area.name}`}</Typography>
			);
		}
	})();

	return <div style={containerStyle}>{content}</div>;
};
