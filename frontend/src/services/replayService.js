// src/services/replayService.js
import { updateBoardState } from "./boardService.js";
import { startPolling, stopPolling } from "./pollingService.js";

export async function startReplay(scene) {
    if (!scene.room.id) return;

    // 리플레이 동안 사용자 조작 금지 + 폴링 중지
    scene.isBoardReady = false;
    stopPolling(scene);

    try {
        const res = await fetch(`/api/game/${scene.room.id}/replay`);
        if (!res.ok) throw new Error("Replay API error");

        const history = await res.json();

        if (!Array.isArray(history) || history.length === 0) {
            alert("리플레이 기록이 없습니다.");
            scene.isBoardReady = true;
            startPolling(scene);
            return;
        }

        let idx = 0;

        const interval = setInterval(() => {
            const frame = history[idx];

            // 리플레이 종료
            if (!frame) {
                clearInterval(interval);

                scene.isBoardReady = true;
                scene.blockPieceClick = false;
                scene.showReplayEndModal();

                startPolling(scene);
                return;
            }

            // 👇 서버가 보낸 frame 그대로 적용 (프론트는 판단/조립 안함)
            updateBoardState(scene, frame.board_state);

            idx++;
        }, 800);
    } catch (err) {
        console.error("리플레이 실패:", err);

        // 문제 생겨도 복구
        scene.isBoardReady = true;
        scene.blockPieceClick = false;
        scene.showReplayEndModal();
        startPolling(scene);
    }
}
