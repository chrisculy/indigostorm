import React from 'react';
import { Typography } from '@material-ui/core';

interface HandDisplayProps {}

const HandDisplay: React.StatelessComponent<HandDisplayProps> = (props: HandDisplayProps) => {
	return <Typography variant="h6">{'Player hand display goes here'}</Typography>;
};

export default HandDisplay;
