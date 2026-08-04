import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import express from "express";
import dotenv from "dotenv";
import { logger } from "./utils/logger.js";
import { data as commands } from "./commands/music.js";
import { handleInteraction } from "./events/interactionCreate.js";

dotenv.config();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

// Express Web Server chống Render Sleep
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send(" ZiPlayer Bot is Online & Alive!"));
app.get("/health", (req, res) => res.status(200).json({ status: "OK", uptime: process.uptime() }));

app.listen(PORT, () => {
	logger("INFO", `Health Check Server chạy trên port: ${PORT}`);
});

// Đăng ký Slash Commands
client.once("ready", async () => {
	logger("INFO", `🤖 Bot đã online dưới tên: ${client.user.tag}`);

	const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
	try {
		logger("INFO", "🔄 Đang làm mới Slash Commands...");
		if (process.env.GUILD_ID) {
			await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
				body: commands,
			});
		} else {
			await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
		}
		logger("INFO", "✅ Slash Commands đã cập nhật thành công!");
	} catch (error) {
		logger("ERROR", `Lỗi cập nhật Commands: ${error.message}`);
	}
});

client.on("interactionCreate", handleInteraction);

// Chống crash quy mô lớn
process.on("unhandledRejection", (reason) => {
	logger("ERROR", `Unhandled Rejection: ${reason}`);
});
process.on("uncaughtException", (err) => {
	logger("ERROR", `Uncaught Exception: ${err.message}`);
});

client.login(process.env.TOKEN);
