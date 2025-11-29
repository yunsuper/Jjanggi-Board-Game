// src/services/pollingService.js
import { updateBoardState } from "./boardService.js";
import { updateTurnUI } from "../ui/turnUI.js";

let lastPlayersCount = null;
let isPolling = false;
let pollingInterval = null; 

export function startPolling(scene) {
    console.log("🔄 startPolling 호출됨");

    if (isPolling) return;
    isPolling = true;

    pollingInterval = setInterval(async () => {
        if (!scene.room.id) return;
        if (!scene.isBoardReady) return;

        try {
            const res = await fetch(`/api/game/${scene.room.id}/load`);
            if (!res.ok) return;

            const data = await res.json();
            const newPlayers = data.players || [];
            const newCount = newPlayers.length;

            if (lastPlayersCount === null) {
                lastPlayersCount = newCount;
            } else {
                // ================================
                // 2) 상대방이 방을 나간 경우 감지
                // ================================
                if (lastPlayersCount === 2 && newCount === 1) {
                    console.log("⚠ 상대방이 방을 나갔습니다.");
                    document
                        .querySelector("#opponent-left-modal")
                        ?.classList.add("show");
                }

                lastPlayersCount = newCount;
            }

            // ================================
            // 🔥 Winner 감지 (폴링에서 패배자도 잡힘)
            // ================================
            if (data.winner) {
                console.log("🏁 폴링에서 승리 감지:", data.winner);

                // 🔥 나의 role과 비교해서 승/패 판단
                let resultForMe =
                    data.winner === scene.playerRole ? "YOU_WIN" : "YOU_LOSE";

                scene.showGameResultModal?.(resultForMe);

                stopPolling(scene);
                return;
            }

            // ⭐ 서버 보드 상태 그대로 반영
            updateBoardState(scene, data.board_state);

            // players 저장 (UI용)
            scene.room.players = data.players;

            // 턴 UI
            updateTurnUI(data.turn, data.players);

            // 플레이어 UI 갱신
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
