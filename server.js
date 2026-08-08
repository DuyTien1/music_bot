const express = require("express");
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// =========================================================================
// DANH SÁCH TỪ VỰNG (70% DỄ - 30% KHÓ)
// =========================================================================
const BIG_WORD_BANKS = {
	vi_dau: {
		easy: [
			"ngày",
			"đêm",
			"mưa",
			"nắng",
			"gió",
			"mây",
			"sông",
			"núi",
			"biển",
			"rừng",
			"trời",
			"đất",
			"lửa",
			"nước",
			"cây",
			"hoa",
			"lá",
			"cỏ",
			"chim",
			"cá",
			"nhà",
			"xe",
			"cơm",
			"áo",
			"tiền",
			"sách",
			"bút",
			"bàn",
			"ghế",
			"đèn",
			"tay",
			"chân",
			"mắt",
			"mũi",
			"tai",
			"miệng",
			"tóc",
			"răng",
			"mặt",
			"lưng",
			"anh",
			"em",
			"ông",
			"bà",
			"cha",
			"mẹ",
			"con",
			"chú",
			"bác",
			"cô",
			"thầy",
			"bạn",
			"người",
			"bé",
			"trẻ",
			"già",
			"nam",
			"nữ",
			"tôi",
			"ta",
			"mình",
			"bạn",
			"họ",
			"ai",
			"gì",
			"đâu",
			"đây",
			"đó",
			"này",
			"kia",
			"sáng",
			"trưa",
			"chiều",
			"tối",
			"hôm",
			"mai",
			"nay",
			"sớm",
			"muộn",
			"lúc",
			"giờ",
			"năm",
			"tháng",
			"tuần",
			"phút",
			"mùa",
			"xuân",
			"hè",
			"thu",
			"đông",
		],
		hard: [
			"khoảnh",
			"nghiêng",
			"khuếch",
			"khuỵu",
			"ngoéo",
			"thuở",
			"ngoằn",
			"ngoèo",
			"nghiến",
			"nguyện",
			"truyền",
			"khuyến",
			"chuyện",
			"quyển",
			"quỷ",
			"nghễu",
			"nghiễu",
			"soạn",
			"duyệt",
			"chuộng",
			"hoảng",
			"khoảng",
			"nghèo",
			"xoắn",
		],
	},
	vi_nodau: {
		easy: [
			"ngay",
			"dem",
			"mua",
			"nang",
			"gio",
			"may",
			"song",
			"nui",
			"bien",
			"rung",
			"troi",
			"dat",
			"lua",
			"nuoc",
			"cay",
			"hoa",
			"la",
			"co",
			"chim",
			"ca",
			"nha",
			"xe",
			"com",
			"ao",
			"tien",
			"sach",
			"but",
			"ban",
			"ghe",
			"den",
		],
		hard: [
			"khoanh",
			"nghieng",
			"khuech",
			"khuyu",
			"ngoeo",
			"thuo",
			"ngoan",
			"ngheo",
			"nghien",
			"nguyen",
			"truyen",
			"khuyen",
			"chuyen",
			"quyen",
			"quy",
		],
	},
	en: {
		easy: [
			"cat",
			"dog",
			"sun",
			"moon",
			"star",
			"tree",
			"book",
			"pen",
			"desk",
			"fish",
			"fast",
			"good",
		],
		hard: [
			"rhythm",
			"queue",
			"knapsack",
			"quizzical",
			"puzzling",
			"knowledge",
			"strength",
			"synergy",
		],
	},
};

function generateWords(lang, count = 100) {
	const bank = BIG_WORD_BANKS[lang] || BIG_WORD_BANKS.vi_dau;
	const result = [];
	for (let i = 0; i < count; i++) {
		const isHard = Math.random() < 0.3;
		const pool = isHard ? bank.hard : bank.easy;
		const randomWord = pool[Math.floor(Math.random() * pool.length)];
		result.push(randomWord);
	}
	return result;
}

const rooms = { en: [], vi_nodau: [], vi_dau: [] };
let globalChatMessages = [];
let totalOnlineUsers = 0;

function getOrCreateRoom(lang) {
	let roomList = rooms[lang] || rooms.vi_dau;
	let room = roomList.find((r) => r.state === "waiting" && r.players.length < 10);

	if (!room) {
		room = {
			id: "room_" + lang + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
			lang: lang,
			state: "waiting",
			players: [],
			words: generateWords(lang),
			matchInterval: null,
			finishedCount: 0,
		};
		roomList.push(room);
	}
	return room;
}

// =========================================================================
// XỬ LÝ KẾT NỐI REALTIME (SOCKET.IO)
// =========================================================================
io.on("connection", (socket) => {
	totalOnlineUsers++;
	io.emit("update_online_count", totalOnlineUsers);

	let currentRoom = null;
	let player = null;

	// 1. NGƯỜI CHƠI VÀO PHÒNG CHỜ
	socket.on("join_lobby", ({ username, language }) => {
		const selectedLang = language || "vi_dau";
		currentRoom = getOrCreateRoom(selectedLang);

		player = {
			id: socket.id,
			username: username || "TayĐua_" + Math.floor(1000 + Math.random() * 9000),
			progress: 0,
			wpm: 0,
			correctChars: 0,
			errors: 0,
			isFinished: false,
		};

		currentRoom.players.push(player);
		socket.join(currentRoom.id);

		// Cập nhật danh sách phòng chờ cho tất cả mọi người trong phòng
		io.to(currentRoom.id).emit("update_lobby", {
			players: currentRoom.players,
			lang: currentRoom.lang,
		});
	});

	// 2. BẤM NÚT "BẮT ĐẦU TRẬN ĐẤU NGAY"
	socket.on("force_start_game", () => {
		if (currentRoom && currentRoom.state === "waiting") {
			currentRoom.state = "racing";
			io.to(currentRoom.id).emit("game_start", {
				words: currentRoom.words,
				players: currentRoom.players,
				countdown: 3,
			});
		}
	});

	// 3. ĐỔI TÊN NGƯỜI CHƠI
	socket.on("update_username", ({ username }) => {
		if (player && currentRoom) {
			player.username = username;
			io.to(currentRoom.id).emit("update_lobby", {
				players: currentRoom.players,
			});
		}
	});

	// 4. CẬP NHẬT TIẾN ĐỘ DẠY THI ĐẤU (REALTIME RACE)
	socket.on("update_progress", (data) => {
		if (!currentRoom || currentRoom.state !== "racing" || !player) return;

		player.progress = data.progress || 0;
		player.wpm = data.wpm || 0;
		player.correctChars = data.correctChars || 0;
		player.errors = data.errors || 0;

		io.to(currentRoom.id).emit("race_update", currentRoom.players);
	});

	// 5. NGƯỜI CHƠI HOÀN THÀNH
	socket.on("player_finished", (data) => {
		if (!currentRoom || !player || player.isFinished) return;

		player.isFinished = true;
		player.wpm = data.wpm;
		player.correctChars = data.correctChars;
		player.errors = data.errors;
		player.progress = 100;

		currentRoom.finishedCount++;

		// Nếu tất cả người chơi hoàn thành
		if (currentRoom.finishedCount >= currentRoom.players.length) {
			finishMatch(currentRoom);
		}
	});

	// 6. GLOBAL CHAT & IN-GAME CHAT
	socket.on("send_global_chat", ({ message }) => {
		if (!message || !message.trim() || !player) return;
		io.emit("receive_global_chat", {
			username: player.username,
			message: message.trim(),
			timestamp: Date.now(),
		});
	});

	socket.on("send_in_game_chat", ({ message }) => {
		if (currentRoom && player && message) {
			io.to(currentRoom.id).emit("receive_in_game_chat", {
				username: player.username,
				message: message.trim(),
			});
		}
	});

	// 7. XỬ LÝ NGẮT KẾT NỐI
	socket.on("disconnect", () => {
		totalOnlineUsers = Math.max(0, totalOnlineUsers - 1);
		io.emit("update_online_count", totalOnlineUsers);

		if (currentRoom && player) {
			currentRoom.players = currentRoom.players.filter((p) => p.id !== socket.id);

			if (currentRoom.players.length === 0) {
				if (rooms[currentRoom.lang]) {
					rooms[currentRoom.lang] = rooms[currentRoom.lang].filter((r) => r.id !== currentRoom.id);
				}
			} else {
				if (currentRoom.state === "waiting") {
					io.to(currentRoom.id).emit("update_lobby", { players: currentRoom.players });
				} else if (currentRoom.state === "racing") {
					io.to(currentRoom.id).emit("race_update", currentRoom.players);
				}
			}
		}
	});
});

function finishMatch(room) {
	if (room.state === "finished") return;
	room.state = "finished";

	// Sắp xếp danh sách xếp hạng theo WPM giảm dần
	const leaderboard = [...room.players].sort((a, b) => b.wpm - a.wpm);
	io.to(room.id).emit("game_over", leaderboard);
}

// Keep-Alive Service
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_EXTERNAL_URL) {
	setInterval(
		() => {
			const protocol = RENDER_EXTERNAL_URL.startsWith("https") ? https : http;
			protocol
				.get(RENDER_EXTERNAL_URL, (res) => {
					console.log(`[Keep-Alive] Ping Server: ${res.statusCode}`);
				})
				.on("error", (err) => console.error("[Keep-Alive] Lỗi:", err.message));
		},
		10 * 60 * 1000,
	);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server đang chạy trên port ${PORT}`));
