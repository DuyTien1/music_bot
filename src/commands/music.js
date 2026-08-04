import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { musicManager } from "../player/playerManager.js";
import { createMusicComponents } from "../buttons/musicButtons.js";
import { logger } from "../utils/logger.js";

export const data = [
	new SlashCommandBuilder()
		.setName("play")
		.setDescription("Phát nhạc từ Spotify, YouTube, SoundCloud...")
		.addStringOption((opt) =>
			opt.setName("query").setDescription("Tên bài hát hoặc URL").setRequired(true),
		),
	new SlashCommandBuilder().setName("skip").setDescription("Bỏ qua bài hiện tại"),
	new SlashCommandBuilder().setName("stop").setDescription("Dừng phát và dọn hàng chờ"),
	new SlashCommandBuilder().setName("pause").setDescription("Tạm dừng nhạc"),
	new SlashCommandBuilder().setName("resume").setDescription("Tiếp tục phát nhạc"),
	new SlashCommandBuilder().setName("queue").setDescription("Xem danh sách hàng chờ"),
	new SlashCommandBuilder()
		.setName("remove")
		.setDescription("Xóa bài theo STT")
		.addIntegerOption((opt) =>
			opt.setName("index").setDescription("Vị trí bài hát").setRequired(true),
		),
	new SlashCommandBuilder().setName("clear").setDescription("Xóa sạch hàng chờ"),
	new SlashCommandBuilder().setName("shuffle").setDescription("Trộn bài ngẫu nhiên"),
	new SlashCommandBuilder()
		.setName("loop")
		.setDescription("Chế độ lặp")
		.addStringOption((opt) =>
			opt
				.setName("mode")
				.setDescription("Chế độ")
				.addChoices(
					{ name: "Off", value: "off" },
					{ name: "Track", value: "track" },
					{ name: "Queue", value: "queue" },
				)
				.setRequired(true),
		),
	new SlashCommandBuilder().setName("nowplaying").setDescription("Thông tin bài đang phát"),
	new SlashCommandBuilder()
		.setName("seek")
		.setDescription("Xả nhạc")
		.addIntegerOption((opt) => opt.setName("seconds").setDescription("Số giây").setRequired(true)),
	new SlashCommandBuilder()
		.setName("volume")
		.setDescription("Chỉnh âm lượng")
		.addIntegerOption((opt) => opt.setName("percent").setDescription("0-200").setRequired(true)),
	new SlashCommandBuilder().setName("lyrics").setDescription("Lời bài hát"),
	new SlashCommandBuilder().setName("autoplay").setDescription("Tự động phát bài liên quan"),
	new SlashCommandBuilder()
		.setName("filter")
		.setDescription("Bật hiệu ứng âm thanh")
		.addStringOption((opt) =>
			opt
				.setName("name")
				.setDescription("Tên filter")
				.addChoices(
					{ name: "Bassboost", value: "bassboost" },
					{ name: "Nightcore", value: "nightcore" },
					{ name: "8D", value: "8d" },
					{ name: "Clear All", value: "clear" },
				)
				.setRequired(true),
		),
	new SlashCommandBuilder().setName("bassboost").setDescription("Bật nhanh Bassboost"),
	new SlashCommandBuilder().setName("nightcore").setDescription("Bật nhanh Nightcore"),
	new SlashCommandBuilder()
		.setName("speed")
		.setDescription("Chỉnh tốc độ")
		.addNumberOption((opt) => opt.setName("rate").setDescription("0.5 - 2.0").setRequired(true)),
	new SlashCommandBuilder().setName("help").setDescription("Xem danh sách lệnh"),
];

export async function executeSlash(interaction) {
	const { commandName, options, guildId, member } = interaction;
	const player = await musicManager.create(guildId);
	const voiceChannel = member.voice.channel;

	if (commandName === "help") {
		return interaction.reply({
			content: "🔥 **ZiPlayer Music Core - Ready!** Sử dụng `/play <tên bài>` để quẩy nhé bro!",
			flags: MessageFlags.Ephemeral,
		});
	}

	if (!voiceChannel) {
		return interaction.reply({
			content: "🫡 Nhập hội vào Voice Channel trước đã bro!",
			flags: MessageFlags.Ephemeral,
		});
	}

	if (!player.connection) {
		await player.connect(voiceChannel);
	}

	await interaction.deferReply();

	try {
		switch (commandName) {
			case "play": {
				const query = options.getString("query");
				const wasPlaying = player.isPlaying || player.currentTrack;

				const success = await player.play(query, interaction.user.id);
				if (!success) {
					return interaction.editReply({
						content: "🫡 Không tìm thấy bài nào giống mô tả đó cả bro!",
					});
				}

				// TRƯỜNG HỢP 1: Bài hát được THÊM VÀO HÀNG CHỜ (Đang có bài phát)
				if (wasPlaying && player.upcomingTracks.length > 0) {
					const addedTrack = player.upcomingTracks[player.upcomingTracks.length - 1];
					const upcomingList = player.upcomingTracks.slice(0, 10);

					const formattedQueue = upcomingList
						.map(
							(t, idx) =>
								`\`${idx + 1}.\` **[${t.title}](${t.url})** | Yêu cầu: <@${t.requestedBy}>`,
						)
						.join("\n");

					const queueEmbed = new EmbedBuilder()
						.setColor("#3498db")
						.setTitle("😎 Bài hát đã vào hàng chờ!  ")
						.setDescription(
							`✅ Đã thêm: **[${addedTrack.title}](${addedTrack.url})**\n👤 Yêu cầu bởi: <@${interaction.user.id}>\n\n`,
						)
						.addFields({
							name: `\n📜 Danh sách 10 bài tiếp theo (${player.upcomingTracks.length} bài trong hàng chờ):`,
							value: formattedQueue || "Không có bài nào tiếp theo",
						})
						.setThumbnail(addedTrack.thumbnail)
						.setTimestamp();

					return interaction.editReply({
						content: "🎵 Đã thêm bài vào danh sách thành công!",
						embeds: [queueEmbed],
					});
				}

				// TRƯỜNG HỢP 2: Bài phát ĐẦU TIÊN (Khởi tạo Player UI)
				const track = player.currentTrack;
				const progress = player.getProgressBar({ size: 12, barChar: "─", progressChar: "█" });
				const time = player.getTime();

				const embed = new EmbedBuilder()
					.setColor("#1DB954")
					.setTitle("🎶 Đang phát")
					.setDescription(
						`**[${track.title}](${track.url})**\n\n\`${time.formatted.current}\` ${progress} \`${time.formatted.total}\``,
					)
					.addFields(
						{ name: "👤 Tác giả", value: track.author || "N/A", inline: true },
						{ name: "🎧 Yêu cầu bởi", value: `<@${interaction.user.id}>`, inline: true },
						{ name: "🔊 Volume", value: `${player.volume}%`, inline: true },
					)
					.setThumbnail(track.thumbnail);

				return interaction.editReply({
					content: "🎵 Đã lên nhạc nhé bro 🔥",
					embeds: [embed],
					components: createMusicComponents(player),
				});
			}

			case "skip":
				player.skip();
				return interaction.editReply({ content: "⏭ Skip cực mượt luôn." });

			case "stop":
				player.stop();
				return interaction.editReply({ content: "⏹ Đã dừng nhạc và dọn sạch phòng!" });

			case "pause":
				player.pause();
				return interaction.editReply({ content: "⏸ Tạm dừng rồi nhé!" });

			case "resume":
				player.resume();
				return interaction.editReply({ content: "▶ Chiến tiếp thôi bro!" });

			case "queue": {
				const tracks = player.upcomingTracks.slice(0, 10);
				const qList =
					tracks.map((t, i) => `${i + 1}. **${t.title}** - <@${t.requestedBy}>`).join("\n") ||
					"Queue trống trơn luôn...";
				return interaction.editReply({ content: `😎 **Playlist hàng chờ:**\n${qList}` });
			}

			case "shuffle":
				player.shuffle();
				return interaction.editReply({ content: "🔀 Đã trộn tung bài hát lên!" });

			case "loop": {
				const mode = options.getString("mode");
				player.loop(mode);
				return interaction.editReply({
					content: `🔁 Chế độ Loop hiện tại: **${mode.toUpperCase()}**`,
				});
			}

			case "volume": {
				const vol = options.getInteger("percent");
				player.setVolume(vol);
				return interaction.editReply({ content: `🔊 Đã chỉnh Volume lên: **${vol}%**` });
			}

			case "bassboost":
				await player.filter.applyFilter("bassboost");
				return interaction.editReply({
					content: "🎧 Bắt được bản chất lượng cao rồi - BASSBOOST ON!",
				});

			default:
				return interaction.editReply({ content: "Lệnh đang được cập nhật..." });
		}
	} catch (err) {
		logger("ERROR", `Lỗi xử lý /${commandName}: ${err.message}`);
		return interaction.editReply({ content: "🔥 Rớt đài rồi bro, tui tự kết nối lại ngay đây!" });
	}
}
