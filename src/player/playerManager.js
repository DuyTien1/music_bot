import { PlayerManager } from "ziplayer";
import { YouTubePlugin, SpotifyPlugin } from "@ziplayer/plugin";
import { InfinityPlugin } from "@ziplayer/infinity";
import playdl from "play-dl";
import { HttpsProxyAgent } from "https-proxy-agent";
import { logger } from "../utils/logger.js";
import dotenv from "dotenv";
dotenv.config();

const proxyUrl = process.env.RESIDENTIAL_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

if (proxyUrl) {
	logger("SEARCH", "⚡ Đã kích hoạt Residential Proxy để bypass Youtube IP Block!");
}

// 1. Cấu hình Custom Stream Extractor dùng play-dl để bypass lỗi decipher của Youtube
const playDlExtractor = async (track) => {
	try {
		// Nếu track có URL YouTube hoặc được resolve từ Spotify
		const ytUrl = track.url || track.raw?.url;
		if (ytUrl) {
			const stream = await playdl.stream(ytUrl, {
				proxy: proxyUrl,
				quality: 2,
			});
			return {
				stream: stream.stream,
				type: stream.type,
			};
		}
	} catch (err) {
		logger("WARN", `play-dl stream error: ${err.message}`);
	}
	return null;
};

// 2. Cấu hình Plugins với ưu tiên
const spotifyPlugin = new SpotifyPlugin({ fetchOptions: { agent } });
spotifyPlugin.priority = 30;

// Gắn play-dl làm fallback stream cho YouTubePlugin
const youtubePlugin = new YouTubePlugin({
	fetchOptions: { agent },
	customStream: playDlExtractor,
});
youtubePlugin.priority = 20;

const infinityPlugin = new InfinityPlugin();
infinityPlugin.priority = 10;

export const musicManager = new PlayerManager({
	plugins: [spotifyPlugin, youtubePlugin, infinityPlugin],
	autoCleanup: true,
	extractorTimeout: 25000,
	enableSearchCache: true,
});

// Lắng nghe sự kiện hệ thống
musicManager.on("trackStart", (player, track) => {
	logger("PLAYER", `▶ Đang phát [Guild: ${player.guildId}]: ${track.title}`);
});

musicManager.on("playerError", async (player, error, track) => {
	logger("ERROR", `🔥 Lỗi phát nhạc (${track?.title || "Unknown"}): ${error.message}`);
	try {
		if (player.connection) {
			logger("VOICE", "🔄 Đang tự khôi phục Voice connection & Stream...");
			await player.refreshPlayerResource(true);
		}
	} catch (err) {
		logger("ERROR", `Không thể khôi phục voice: ${err.message}`);
	}
});

musicManager.on("queueEnd", (player) => {
	logger("PLAYER", `💤 Hết bài rồi, tui xin phép nghỉ nha. [Guild: ${player.guildId}]`);
});
