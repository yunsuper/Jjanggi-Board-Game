// src/services/pollingService.js
import { updateBoardState } from "./boardService.js";
import { updateTurnUI } from "../ui/turnUI.js";
import { checkWinner } from "../utils/checkWinner.js";


let isPolling = false;
let pollingInterval = null;

export function startPolling(scene) {
    console.log("🔄 startPolling 호출됨");

    // 이미 polling 중이면 무시
    if (isPolling) {
        console.log("⛔ 이미 polling 중 — 새로 시작 안 함");
        return;
    }

    isPolling = true;

    // 🔥 마지막 플레이어 수 기억용
    let lastPlayersCount = scene.room.players ? scene.room.players.length : 0;

    pollingInterval = setInterval(async () => {
        if (!scene.room.id) return;
        if (!scene.isBoardReady) return;

        try {
            const res = await fetch(`/api/game/${scene.room.id}/load`);

            // 🔥 ① 방이 사라진 경우(상대 나감) 감지 — 여기만 새로 추가!!
            if (res.status === 404 || res.status === 500) {
                alert("상대방이 방에서 나갔습니다.");
                stopPolling();
                return;
            }

            if (!res.ok) return;

            const data = await res.json();

            // 🔥 새 players 배열
            const newPlayers = data.players || [];
            const prevCount = lastPlayersCount;
            const newCount = newPlayers.length;
            lastPlayersCount = newCount;

            // 🔔 2명 → 1명으로 줄어들면 = 상대방이 나감
            if (prevCount === 2 && newCount === 1) {
                const modal = document.querySelector("#opponent-left-modal");
                modal?.classList.add("show");
            }

            // ✅ 승리 감지
            const winner = checkWinner({
                pieces: data.board_state.pieces,
            });
            if (winner) {
                stopPolling();
                scene.showGameResultModal(winner);
                return; // 폴링 종료
            }

            updateBoardState(scene, {
                ...data.board_state,
                turn: data.turn,
            });

            // 🔥 NEW: players 갱신 추가
            scene.room.players = data.players;

            // 🔥 NEW: 현재 턴 UI 갱신
            updateTurnUI(data.turn, data.players);
            updatePlayersUI(data.players);
        } catch (err) {
            console.error("Polling error:", err);
        }
    }, 1500);
}

export function stopPolling() {
    console.log("🛑 stopPolling 호출됨");

    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }

    isPolling = false;
}

export function updatePlayersUI(players) {
    const p1 = players.find((p) => p.role === "player1");
    const p2 = players.find((p) => p.role === "player2");

    document.querySelector(".player1-name").innerText = `초: ${
        p1?.nickname || "-"
    }`;

    document.querySelector(".player2-name").innerText = `한: ${
        p2?.nickname || "-"
    }`;
}