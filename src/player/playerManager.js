import { PlayerManager } from "ziplayer";
import { YouTubePlugin, SpotifyPlugin, SoundCloudPlugin } from "@ziplayer/plugin";
import { HttpsProxyAgent } from "https-proxy-agent";
import { logger } from "../utils/logger.js";
import dotenv from "dotenv";
dotenv.config();

const proxyUrl = process.env.RESIDENTIAL_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

if (proxyUrl) {
	logger("SEARCH", "⚡ Đã kích hoạt Residential Proxy để bypass Youtube IP Block!");
}

// Thiết lập Plugins với ưu tiên: Spotify -> YouTube -> SoundCloud
const spotifyPlugin = new SpotifyPlugin({ fetchOptions: { agent } });
spotifyPlugin.priority = 30;

const youtubePlugin = new YouTubePlugin({ fetchOptions: { agent } });
youtubePlugin.priority = 20;

const soundcloudPlugin = new SoundCloudPlugin();
soundcloudPlugin.priority = 10;

export const musicManager = new PlayerManager({
	plugins: [spotifyPlugin, youtubePlugin, soundcloudPlugin],
	autoCleanup: true,
	extractorTimeout: 20000,
	enableSearchCache: true,
});

// Lắng nghe sự kiện hệ thống
musicManager.on("trackStart", (player, track) => {
	logger("PLAYER", `▶ Đang phát [Guild: ${player.guildId}]: ${track.title}`);
});

musicManager.on("playerError", async (player, error, track) => {
	logger("ERROR", `🔥 Lỗi phát nhạc (${track?.title || "Unknown"}): ${error.message}`);
	// Tự động retry hoặc hồi phục stream
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
