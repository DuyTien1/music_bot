// =========================================================================
// KHỞI TẠO SOCKET & BIẾN TOÀN CỤC
// =========================================================================
const socket = io();

let currentLanguage = "vi_dau";
let myUsername = "Vô danh";
let currentWords = [];
let wordIndex = 0;
let correctChars = 0;
let totalErrors = 0;
let isPlaying = false;
let startTime = null;
let timerInterval = null;

// Avatar đua xe
const runnerIcons = ["🏎️", "🏎️‍💥", "🚀", "⚡", "🛸", "🏍️", "🏎️", "🏎️‍💥"];

// =========================================================================
// QUẢN LÝ GIAO DIỆN SÁNG / TỐI (LIGHT / DARK THEME)
// =========================================================================
function initTheme() {
	const savedTheme = localStorage.getItem("racer_theme") || "dark";
	applyTheme(savedTheme);
}

function applyTheme(theme) {
	const themeToggleBtn = document.getElementById("theme-toggle-btn");
	if (theme === "light") {
		document.documentElement.setAttribute("data-theme", "light");
		if (themeToggleBtn) themeToggleBtn.innerText = "☀️ Sáng";
	} else {
		document.documentElement.removeAttribute("data-theme");
		if (themeToggleBtn) themeToggleBtn.innerText = "🌙 Tối";
	}
	localStorage.setItem("racer_theme", theme);
}

// =========================================================================
// SỰ KIỆN KHỞI TẠO DOM
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
	// 1. Khởi tạo Theme & User Profile
	initTheme();
	initUserProfile();

	const themeToggleBtn = document.getElementById("theme-toggle-btn");
	if (themeToggleBtn) {
		themeToggleBtn.addEventListener("click", () => {
			const currentTheme = document.documentElement.getAttribute("data-theme");
			applyTheme(currentTheme === "light" ? "dark" : "light");
		});
	}

	// 2. Chuyển đổi Mode thi đấu
	const modeCards = document.querySelectorAll(".mode-card");
	modeCards.forEach((card) => {
		card.addEventListener("click", () => {
			modeCards.forEach((c) => c.classList.remove("selected"));
			card.classList.add("selected");
			currentLanguage = card.getAttribute("data-lang");
		});
	});

	// 3. Nút Vào Phòng Chờ
	const joinBtn = document.getElementById("join-btn");
	if (joinBtn) {
		joinBtn.addEventListener("click", () => {
			document.getElementById("login-modal").classList.add("hidden");
			document.getElementById("lobby-screen").classList.remove("hidden");

			// Gửi yêu cầu tham gia tới server
			socket.emit("join_lobby", { username: myUsername, language: currentLanguage });
		});
	}

	// 4. Nút Bắt Đầu Trận Đấu Ngay
	const startGameNowBtn = document.getElementById("start-game-now-btn");
	if (startGameNowBtn) {
		startGameNowBtn.addEventListener("click", () => {
			socket.emit("force_start_game");
		});
	}

	// 5. Popup đổi tên
	const btnChangeName = document.getElementById("btn-change-name");
	const renamePopup = document.getElementById("rename-popup");
	const popupNameInput = document.getElementById("popup-name-input");
	const btnSavePopupName = document.getElementById("btn-save-popup-name");
	const btnCancelPopupName = document.getElementById("btn-cancel-popup-name");

	if (btnChangeName) {
		btnChangeName.addEventListener("click", () => {
			popupNameInput.value = myUsername;
			renamePopup.classList.remove("hidden");
			popupNameInput.focus();
		});
	}
	if (btnCancelPopupName) {
		btnCancelPopupName.addEventListener("click", () => {
			renamePopup.classList.add("hidden");
		});
	}
	if (btnSavePopupName) {
		btnSavePopupName.addEventListener("click", () => {
			const newName = popupNameInput.value.trim();
			if (newName) {
				myUsername = newName;
				localStorage.setItem("racer_username", myUsername);
				document.getElementById("profile-name").innerText = myUsername;
				renamePopup.classList.add("hidden");
				socket.emit("update_username", { username: myUsername });
			}
		});
	}

	// 6. Khung Chat Toàn Cục
	setupGlobalChat();

	// 7. Ô gõ chữ chính
	const typeInput = document.getElementById("type-input");
	if (typeInput) {
		typeInput.addEventListener("input", handleTypingInput);
	}

	// 8. Chơi lại & Về trang chủ
	document.getElementById("btn-play-again")?.addEventListener("click", () => {
		document.getElementById("summary-modal").classList.add("hidden");
		document.getElementById("game-container").classList.add("hidden");
		document.getElementById("lobby-screen").classList.remove("hidden");
		socket.emit("join_lobby", { username: myUsername, language: currentLanguage });
	});

	document.getElementById("btn-home")?.addEventListener("click", () => {
		document.getElementById("summary-modal").classList.add("hidden");
		document.getElementById("game-container").classList.add("hidden");
		document.getElementById("lobby-screen").classList.add("hidden");
		document.getElementById("login-modal").classList.remove("hidden");
	});

	// 9. Chat Nhanh In-Game
	const chatInput = document.getElementById("chat-input");
	if (chatInput) {
		chatInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				const msg = chatInput.value.trim();
				if (msg) {
					socket.emit("send_in_game_chat", { message: msg });
					chatInput.value = "";
				}
			}
		});
	}
});

function initUserProfile() {
	let savedName = localStorage.getItem("racer_username");
	if (!savedName) {
		savedName = "TayĐua_" + Math.floor(1000 + Math.random() * 9000);
		localStorage.setItem("racer_username", savedName);
	}
	myUsername = savedName;
	const profileName = document.getElementById("profile-name");
	if (profileName) profileName.innerText = myUsername;
}

// =========================================================================
// LẮNG NGHE SỰ KIỆN TỪ SERVER (SOCKET.IO)
// =========================================================================
socket.on("update_online_count", (count) => {
	const onlineCount = document.getElementById("online-count");
	if (onlineCount) onlineCount.innerText = count;
});

socket.on("update_lobby", (data) => {
	const lobbyCount = document.getElementById("lobby-count");
	const lobbyPlayersGrid = document.getElementById("lobby-players-grid");

	if (lobbyCount) lobbyCount.innerText = `${data.players.length}/10`;
	if (lobbyPlayersGrid) {
		lobbyPlayersGrid.innerHTML = "";
		data.players.forEach((p) => {
			const card = document.createElement("div");
			card.className = "lobby-player-card";
			card.innerText = `🏎️ ${p.username}`;
			lobbyPlayersGrid.appendChild(card);
		});
	}
});

socket.on("game_start", (data) => {
	document.getElementById("lobby-screen").classList.add("hidden");
	document.getElementById("summary-modal").classList.add("hidden");
	document.getElementById("game-container").classList.remove("hidden");
	document.getElementById("chat-container").classList.remove("hidden");

	currentWords = data.words;
	wordIndex = 0;
	correctChars = 0;
	totalErrors = 0;
	isPlaying = false;
	startTime = null;

	const typeInput = document.getElementById("type-input");
	typeInput.value = "";
	typeInput.disabled = true;
	typeInput.placeholder = "Chuẩn bị...";
	document.getElementById("status-box").innerText = "CHUẨN BỊ";

	renderWords();
	renderRaceTracks(data.players);
	startCountdown(data.countdown || 3);
});

// =========================================================================
// LOGIC ĐẾM NGƯỢC & THI ĐẤU
// =========================================================================
function startCountdown(seconds) {
	const timerEl = document.getElementById("timer");
	const statusBox = document.getElementById("status-box");
	const typeInput = document.getElementById("type-input");

	let count = seconds;
	timerEl.innerText = count;
	const cdInterval = setInterval(() => {
		count--;
		if (count > 0) {
			timerEl.innerText = count;
		} else {
			clearInterval(cdInterval);
			timerEl.innerText = "300";
			statusBox.innerText = "ĐANG THI ĐẤU";
			typeInput.disabled = false;
			typeInput.placeholder = "Gõ chữ vào đây...";
			typeInput.focus();
			isPlaying = true;
			startTime = Date.now();
			startRaceTimer(300);
		}
	}, 1000);
}

function startRaceTimer(duration) {
	const timerEl = document.getElementById("timer");
	let timeLeft = duration;
	if (timerInterval) clearInterval(timerInterval);
	timerInterval = setInterval(() => {
		timeLeft--;
		timerEl.innerText = timeLeft;
		if (timeLeft <= 0) {
			clearInterval(timerInterval);
			finishGame();
		}
	}, 1000);
}

// Render từ cần gõ
function renderWords() {
	const wordsDisplay = document.getElementById("words-display");
	wordsDisplay.innerHTML = "";
	currentWords.forEach((word, idx) => {
		const span = document.createElement("span");
		span.className = "word";
		// Từ hiện tại ban đầu gán lớp Focus Xanh Lá
		if (idx === wordIndex) span.className = "word current correct-typing";
		span.innerText = word;
		wordsDisplay.appendChild(span);
	});
	scrollCurrentWordIntoView();
}

function scrollCurrentWordIntoView() {
	const wordsDisplay = document.getElementById("words-display");
	const currentSpan = wordsDisplay.children[wordIndex];
	if (currentSpan) {
		currentSpan.scrollIntoView({ behavior: "smooth", block: "nearest" });
	}
}

// =========================================================================
// XỬ LÝ SỰ KIỆN GÕ CHỮ (LUÔN GIỮ FOCUS TẠI MỌI THỜI ĐIỂM)
// =========================================================================
function handleTypingInput(e) {
	if (!isPlaying) return;

	const typeInput = e.target;
	const val = typeInput.value;
	const targetWord = currentWords[wordIndex];

	// Khi bấm phím cách (Space)
	if (val.endsWith(" ")) {
		const typedWord = val.trim();

		if (typedWord === targetWord) {
			// --- ĐÚNG TỪ ---
			correctChars += targetWord.length + 1; // +1 cho phím cách
			markWordStatus(wordIndex, "correct");

			wordIndex++;
			typeInput.value = "";
			typeInput.classList.remove("input-error");

			// Kiểm tra nếu gõ xong toàn bộ danh sách từ
			if (wordIndex >= currentWords.length) {
				finishGame();
				return;
			} else {
				// Chuyển Focus xanh lá sang từ kế tiếp
				markWordStatus(wordIndex, "current correct-typing");
				scrollCurrentWordIntoView();
			}

			sendProgressUpdate();
		} else {
			// --- SAI TỪ -> NHÁY ĐỎ BAN ĐẦU, XÓA CHỮ, GIỮ FOCUS ĐỎ YÊU CẦU GÕ LẠI ---
			totalErrors++;

			flashInputError(typeInput);

			typeInput.value = "";
			typeInput.classList.remove("input-error");

			// Trả lại Focus Xanh Lá ban đầu cho từ hiện tại bắt đầu gõ lại
			markWordStatus(wordIndex, "current correct-typing");

			typeInput.focus();
		}
	} else {
		// Realtime feedback trong lúc đang gõ từng ký tự dở dang
		if (!targetWord.startsWith(val)) {
			// Gõ SAI ký tự -> GIỮ FOCUS + CHUYỂN MÀU ĐỎ
			typeInput.classList.add("input-error");
			markWordStatus(wordIndex, "current incorrect-typing");
		} else {
			// Gõ ĐÚNG ký tự -> GIỮ FOCUS + CHUYỂN MÀU XANH LÁ
			typeInput.classList.remove("input-error");
			markWordStatus(wordIndex, "current correct-typing");
		}
	}
}

function markWordStatus(index, statusClass) {
	const wordsDisplay = document.getElementById("words-display");
	const targetEl = wordsDisplay.children[index];
	if (targetEl) {
		targetEl.className = "word " + statusClass;
	}
}

function flashInputError(inputEl) {
	inputEl.classList.add("flash-red");
	setTimeout(() => {
		inputEl.classList.remove("flash-red");
	}, 300);
}

function sendProgressUpdate() {
	const progress = Math.min(100, Math.round((wordIndex / currentWords.length) * 100));
	const elapsedTime = (Date.now() - startTime) / 60000;
	const wpm = elapsedTime > 0 ? Math.round(correctChars / 5 / elapsedTime) : 0;

	socket.emit("update_progress", {
		progress: progress,
		wpm: wpm,
		correctChars: correctChars,
		errors: totalErrors,
	});
}

function finishGame() {
	isPlaying = false;
	const typeInput = document.getElementById("type-input");
	typeInput.disabled = true;
	if (timerInterval) clearInterval(timerInterval);
	document.getElementById("status-box").innerText = "HOÀN THÀNH";

	const elapsedTime = (Date.now() - startTime) / 60000;
	const finalWpm = elapsedTime > 0 ? Math.round(correctChars / 5 / elapsedTime) : 0;

	socket.emit("player_finished", {
		wpm: finalWpm,
		correctChars: correctChars,
		errors: totalErrors,
	});
}

// Render đường đua
function renderRaceTracks(players) {
	const raceTracksContainer = document.getElementById("race-tracks-container");
	raceTracksContainer.innerHTML = "";
	players.forEach((p, idx) => {
		const trackRow = document.createElement("div");
		trackRow.className = "track-row";
		trackRow.id = `track-${p.id}`;

		const icon = runnerIcons[idx % runnerIcons.length];
		const colorHue = (idx * 137.5) % 360;

		trackRow.innerHTML = `
			<div class="track-header">
				<span>${p.username} ${p.id === socket.id ? " (Bạn)" : ""}</span>
				<span class="wpm-tag" id="wpm-${p.id}">0 WPM</span>
			</div>
			<div class="track-line-bg">
				<div class="track-line-fill" id="fill-${p.id}" style="width: 0%; background: hsl(${colorHue}, 80%, 50%);">
					<div class="runner-icon-badge" style="border-color: hsl(${colorHue}, 80%, 50%);">${icon}</div>
				</div>
			</div>
		`;
		raceTracksContainer.appendChild(trackRow);
	});
}

socket.on("race_update", (players) => {
	players.forEach((p) => {
		const fillEl = document.getElementById(`fill-${p.id}`);
		const wpmEl = document.getElementById(`wpm-${p.id}`);
		if (fillEl) fillEl.style.width = `${p.progress}%`;
		if (wpmEl) wpmEl.innerText = `${p.wpm || 0} WPM`;
	});
});

// Bảng kết quả & Pháo hoa
socket.on("game_over", (leaderboard) => {
	const summaryTbody = document.getElementById("summary-tbody");
	summaryTbody.innerHTML = "";
	leaderboard.forEach((p, idx) => {
		const tr = document.createElement("tr");
		let rankBadge = `${idx + 1}`;
		if (idx === 0) rankBadge = "🥇 1";
		else if (idx === 1) rankBadge = "🥈 2";
		else if (idx === 2) rankBadge = "🥉 3";

		tr.innerHTML = `
			<td style="font-weight: bold; color: var(--accent);">${rankBadge}</td>
			<td style="font-weight: bold;">${p.username}</td>
			<td style="color: var(--correct);">${p.correctChars || 0}</td>
			<td style="font-weight: bold; color: var(--primary);">${p.wpm || 0} WPM</td>
			<td style="color: var(--secondary);">${p.errors || 0}</td>
		`;
		summaryTbody.appendChild(tr);
	});

	document.getElementById("summary-modal").classList.remove("hidden");
	triggerFireworks();
});

// Chat Global
function setupGlobalChat() {
	const globalChatInputs = document.querySelectorAll(".global-chat-input");
	const globalChatSendBtns = document.querySelectorAll(".global-chat-send-btn");

	function sendMsg(inputEl) {
		const msg = inputEl.value.trim();
		if (msg) {
			socket.emit("send_global_chat", { message: msg });
			inputEl.value = "";
		}
	}

	globalChatSendBtns.forEach((btn) => {
		btn.addEventListener("click", (e) => {
			const wrapper = e.target.closest(".global-chat-input-wrapper");
			sendMsg(wrapper.querySelector(".global-chat-input"));
		});
	});

	globalChatInputs.forEach((input) => {
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") sendMsg(input);
		});
	});
}

socket.on("receive_global_chat", (data) => {
	const chatContainers = document.querySelectorAll(".global-chat-messages");
	chatContainers.forEach((container) => {
		const msgDiv = document.createElement("div");
		msgDiv.className = "chat-msg-item";
		const timeStr = new Date(data.timestamp).toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
		msgDiv.innerHTML = `<span class="chat-msg-user">${data.username}:</span><span>${data.message}</span><span class="chat-msg-time">${timeStr}</span>`;
		container.appendChild(msgDiv);
		container.scrollTop = container.scrollHeight;
	});
});

// Pop-up Chat In-Game
socket.on("receive_in_game_chat", (data) => {
	const chatPopups = document.getElementById("chat-popups");
	const bubble = document.createElement("div");
	bubble.className = "chat-bubble";
	bubble.innerHTML = `<span class="sender">${data.username}</span><div>${data.message}</div>`;
	chatPopups.appendChild(bubble);

	setTimeout(() => {
		bubble.style.opacity = "0";
		bubble.style.transition = "opacity 0.5s ease";
		setTimeout(() => bubble.remove(), 500);
	}, 4000);
});

// Canvas Pháo hoa
const canvas = document.getElementById("fireworks-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;
let particles = [];

function resizeCanvas() {
	if (!canvas) return;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function triggerFireworks() {
	if (!canvas || !ctx) return;
	particles = [];
	for (let i = 0; i < 5; i++) {
		setTimeout(() => {
			createExplosion(Math.random() * canvas.width, Math.random() * (canvas.height * 0.5));
		}, i * 300);
	}
	animateFireworks();
}

function createExplosion(x, y) {
	const count = 60;
	for (let i = 0; i < count; i++) {
		const angle = ((Math.PI * 2) / count) * i;
		const speed = Math.random() * 5 + 2;
		particles.push({
			x: x,
			y: y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			alpha: 1,
			color: `hsl(${Math.random() * 360}, 100%, 50%)`,
		});
	}
}

function animateFireworks() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	particles.forEach((p, idx) => {
		p.x += p.vx;
		p.y += p.vy;
		p.vy += 0.05;
		p.alpha -= 0.015;

		ctx.globalAlpha = Math.max(0, p.alpha);
		ctx.fillStyle = p.color;
		ctx.beginPath();
		ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
		ctx.fill();

		if (p.alpha <= 0) particles.splice(idx, 1);
	});

	if (particles.length > 0) {
		requestAnimationFrame(animateFireworks);
	}
}
