// src/services/replayService.js
import { updateBoardState } from "./boardService.js";
import { startPolling, stopPolling } from "./pollingService.js";

let lastPlayersCount = null;

export async function startReplay(scene) {
    if (!scene.room.id) return;

    // 리플레이 동안 사용자 조작 금지 + 폴링 중지
    scene.isBoardReady = false;
    stopPolling(scene);

    try {
        const res = await fetch(`/api/game/${scene.room.id}/replay`);
        if (!res.ok) throw new Error("Replay API error");

        const history = await res.json();
        if (!history || history.length === 0) {
            alert("리플레이 기록이 없습니다.");
            scene.isBoardReady = true;
            startPolling(scene);
            return;
        }

        let idx = 0;

        const interval = setInterval(() => {
            const h = history[idx];

            // 리플레이 종료
            if (!h) {
                clearInterval(interval);

                scene.isBoardReady = true;

                // ✅ 모달 띄우기!
                scene.showReplayEndModal();

                startPolling(scene);
                return;
            }

            // 턴 + 보드 상태 모두 반영
            updateBoardState(scene, {
                ...h.board_state,
                turn: h.turn,
                players: scene.board_state.players,
            });

            idx++;
        }, 800); // 1초보다 약간 빠르게 재생하면 더 자연스럽다
    } catch (err) {
        console.error("리플레이 실패:", err);

        // 문제 생겨도 복구
        scene.isBoardReady = true;

        // ✅ 에러로 종료되어도 모달 띄움
        scene.showReplayEndModal();
        
        startPolling(scene);
    }
}
