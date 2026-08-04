import config from "../config/config.json" with { type: "json" };
import { MessageFlags } from "discord.js";
import { executeSlash } from "../commands/music.js";
import { musicManager } from "../player/playerManager.js";
import { createMusicComponents } from "../buttons/musicButtons.js";
import { logger } from "../utils/logger.js";

// Khóa chống nhiều người thao tác cùng 1 milisecond (Interaction Lock)
const guildLocks = new Map();

export async function handleInteraction(interaction) {
	// 1. Kiểm tra Text Channel được cho phép
	if (
		config.textChannels &&
		config.textChannels.length > 0 &&
		!config.textChannels.includes(interaction.channelId)
	) {
		return interaction.reply({
			content: "❌ Chỗ này tui không làm việc, qua đúng kênh nhạc đã quy định nhé bro!",
			flags: MessageFlags.Ephemeral,
		});
	}

	// 2. Xử lý Slash Commands
	if (interaction.isChatInputCommand()) {
		return executeSlash(interaction);
	}

	// 3. Xử lý UI Buttons với Khóa chống Spam (Concurrency Protection)
	if (interaction.isButton()) {
		const guildId = interaction.guildId;
		logger(
			"BUTTON",
			`User ${interaction.user.tag} (${interaction.user.id}) bấm nút: ${interaction.customId}`,
		);

		// Kiểm tra Lock của Guild
		if (guildLocks.get(guildId)) {
			return interaction.reply({
				content: "⏳ Thao tác quá nhanh bro ơi! Đang xử lý lệnh trước đó, đợi 1 xíu nhé...",
				flags: MessageFlags.Ephemeral,
			});
		}

		const player = musicManager.get(guildId);

		if (!player) {
			return interaction.reply({
				content: "💤 Làm gì còn bài nào đang phát đâu mà bấm bro?",
				flags: MessageFlags.Ephemeral,
			});
		}

		// Kiểm tra người dùng có ở cùng Voice Channel không
		const memberVoiceChannel = interaction.member?.voice?.channelId;
		const botVoiceChannel = player.connection?.joinConfig?.channelId;

		if (!memberVoiceChannel || (botVoiceChannel && memberVoiceChannel !== botVoiceChannel)) {
			return interaction.reply({
				content: "🫡 Vô cùng Voice Channel với tui rồi hãy chỉnh nhé bro!",
				flags: MessageFlags.Ephemeral,
			});
		}

		// Khóa Guild để tránh tranh chấp dữ liệu khi nhiều người bấm cùng lúc
		guildLocks.set(guildId, true);

		try {
			let responseText = "";

			switch (interaction.customId) {
				case "btn_toggle_play":
					if (player.isPaused) {
						player.resume();
						responseText = "▶️ Đã tiếp tục phát nhạc!";
					} else {
						player.pause();
						responseText = "⏸️ Đã tạm dừng nhạc!";
					}
					break;

				case "btn_skip":
					player.skip();
					responseText = "⏭️ Đã bỏ qua bài hát hiện tại!";
					break;

				case "btn_stop":
					player.stop();
					responseText = "⏹️ Đã dừng phát nhạc và xóa toàn bộ hàng chờ!";
					break;

				case "btn_shuffle":
					player.shuffle();
					responseText = "🔀 Đã xáo trộn danh sách bài hát!";
					break;

				case "btn_loop": {
					const currentMode = player.queue.loopMode || "off";
					const nextMode =
						currentMode === "off" ? "track" : currentMode === "track" ? "queue" : "off";
					player.loop(nextMode);
					responseText = `🔁 Đã chuyển chế độ lặp sang: **${nextMode.toUpperCase()}**`;
					break;
				}

				case "btn_volup": {
					const newVolUp = Math.min(player.volume + 10, 200);
					player.setVolume(newVolUp);
					responseText = `🔊 Âm lượng hiện tại: **${newVolUp}%**`;
					break;
				}

				case "btn_voldown": {
					const newVolDown = Math.max(player.volume - 10, 0);
					player.setVolume(newVolDown);
					responseText = `🔉 Âm lượng hiện tại: **${newVolDown}%**`;
					break;
				}

				case "btn_queue": {
					const tracks = player.upcomingTracks.slice(0, 10);
					const qList =
						tracks.map((t, i) => `${i + 1}. **${t.title}** - <@${t.requestedBy}>`).join("\n") ||
						"Hàng chờ trống trơn...";

					guildLocks.delete(guildId);
					return interaction.reply({
						content: `📜 **Danh sách bài tiếp theo:**\n${qList}`,
						flags: MessageFlags.Ephemeral,
					});
				}

				case "btn_favorite":
					guildLocks.delete(guildId);
					return interaction.reply({
						content: "❤️ Đã thả tim bài hát này!",
						flags: MessageFlags.Ephemeral,
					});

				default:
					responseText = "✅ Thao tác thành công!";
					break;
			}

			// Cập nhật lại giao diện UI chính
			await interaction.update({
				components: createMusicComponents(player),
			});

			// Gửi thông báo phản hồi riêng biệt (Toast Notification) cho người nhấn
			await interaction.followUp({
				content: responseText,
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			logger("ERROR", `Lỗi nút bấm [${interaction.customId}]: ${error.message}`);
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: "🔥 Có lỗi xảy ra khi thực hiện thao tác!",
					flags: MessageFlags.Ephemeral,
				});
			}
		} finally {
			// Mở khóa sau khi hoàn tất
			guildLocks.delete(guildId);
		}
	}
}
