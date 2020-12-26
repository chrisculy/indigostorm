const iconScale = '2em';
export const iconStyle = { width: iconScale, height: iconScale };

export const zeroPad = (value: number, places?: number) => {
	return String(value).padStart(places ? places : 2, '0');
};
