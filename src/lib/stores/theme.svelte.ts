let dark = $state(true);

export const theme = {
	get dark() { return dark; },
	toggle() { dark = !dark; }
};
