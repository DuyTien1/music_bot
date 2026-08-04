import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function createMusicComponents(player) {
	const isPaused = player.isPaused;
	const loopMode = player.queue.loopMode || "off"; // 'off' | 'track' | 'queue'

	const row1 = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId("btn_toggle_play")
			.setEmoji(isPaused ? "▶" : "⏸")
			.setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
		new ButtonBuilder().setCustomId("btn_skip").setEmoji("⏭").setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId("btn_stop").setEmoji("⏹").setStyle(ButtonStyle.Danger),
		new ButtonBuilder().setCustomId("btn_shuffle").setEmoji("🔀").setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId("btn_loop")
			.setEmoji("🔁")
			.setLabel(loopMode.toUpperCase())
			.setStyle(loopMode !== "off" ? ButtonStyle.Success : ButtonStyle.Secondary),
	);

	const row2 = new ActionRowBuilder().addComponents(
		new ButtonBuilder().setCustomId("btn_favorite").setEmoji("❤️").setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId("btn_queue").setEmoji("📜").setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId("btn_voldown").setEmoji("🔉").setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId("btn_volup").setEmoji("🔊").setStyle(ButtonStyle.Secondary),
	);

	return [row1, row2];
}
