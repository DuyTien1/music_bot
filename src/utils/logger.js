import consoleColor from "util";

const colors = {
	INFO: "\x1b[32m", // Green
	WARN: "\x1b[33m", // Yellow
	ERROR: "\x1b[31m", // Red
	VOICE: "\x1b[35m", // Magenta
	PLAYER: "\x1b[36m", // Cyan
	SEARCH: "\x1b[34m", // Blue
	BUTTON: "\x1b[90m", // Gray
	RESET: "\x1b[0m",
};

export const logger = (type, message) => {
	const time = new Date().toLocaleTimeString();
	const color = colors[type] || colors.RESET;
	console.log(`[${time}] ${color}[${type}]${colors.RESET} ${message}`);
};
