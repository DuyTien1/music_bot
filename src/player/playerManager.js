import { PlayerManager } from 'ziplayer';
import { YouTubePlugin, SpotifyPlugin } from '@ziplayer/plugin';
import { InfinityPlugin } from '@ziplayer/infinity';
import { YTexec } from '@ziplayer/ytexecplug';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();

const proxyUrl = process.env.RESIDENTIAL_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

if (proxyUrl) {
  logger('SEARCH', '⚡ Đã kích hoạt Proxy để bypass Youtube Block!');
}

// Cấu hình YTexec làm trình phát fallback chống lỗi LOGIN_REQUIRED
const ytexec = new YTexec();

const youtubePlugin = new YouTubePlugin({
  fetchOptions: { agent },
  fistStream: ytexec.getStream // Sử dụng YTexec để lấy stream khi YouTube blocking
});
youtubePlugin.priority = 20;

const spotifyPlugin = new SpotifyPlugin({ fetchOptions: { agent } });
spotifyPlugin.priority = 30;

const infinityPlugin = new InfinityPlugin();
infinityPlugin.priority = 10;

export const musicManager = new PlayerManager({
  plugins: [spotifyPlugin, youtubePlugin, infinityPlugin],
  autoCleanup: true,
  extractorTimeout: 30000,
  enableSearchCache: true
});

musicManager.on('trackStart', (player, track) => {
  logger('PLAYER', `▶ Đang phát [Guild: ${player.guildId}]: ${track.title}`);
});

musicManager.on('playerError', async (player, error, track) => {
  logger('ERROR', `🔥 Lỗi phát nhạc (${track?.title || 'Unknown'}): ${error.message}`);
  try {
    if (player.connection) {
      logger('VOICE', '🔄 Đang tự khôi phục Voice connection & Stream...');
      await player.refreshPlayerResource(true);
    }
  } catch (err) {
    logger('ERROR', `Không thể khôi phục voice: ${err.message}`);
  }
});
