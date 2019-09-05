import React from 'react';
import { Typography } from '@material-ui/core';

interface DiceDisplayProps {}

const DiceDisplay: React.StatelessComponent<DiceDisplayProps> = (props: DiceDisplayProps) => {
	return <Typography variant="h6">{'Player dice display goes here'}</Typography>;
};

export default DiceDisplay;
