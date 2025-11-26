// src/ui/turnUI.js

export function updateTurnUI(turn, players) {
    const el = document.querySelector(".turn-name");
    if (!el) return;

    // 턴 정보 없음 → 대기 중
    if (!turn) {
        el.innerText = "대기 중...";
        el.style.color = "black";
        return;
    }

    // players가 아직 로딩되지 않은 경우 fallback
    if (!players || players.length === 0) {
        el.innerText =
            turn === "player1" ? "player1 차례 (초)" : "player2 차례 (한)";
        el.style.color = turn === "player1" ? "#1e90ff" : "#c0392b"; // 더 자연스러운 색상
        return;
    }

    // 해당 턴 플레이어 찾기
    const player = players.find((p) => p.role === turn);
    const nickname =
        player?.nickname || (turn === "player1" ? "player1" : "player2");

    el.innerText = turn === "player1" ? `${nickname} (초)` : `${nickname} (한)`;
    el.style.color = turn === "player1" ? "#1e90ff" : "#c0392b";
}
