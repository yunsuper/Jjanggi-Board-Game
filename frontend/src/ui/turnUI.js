// src/ui/turnUI.js

export function updateTurnUI(turn, players = []) {
    const el = document.querySelector(".turn-name");
    if (!el) return;

    // 턴 정보가 없으면 그냥 "대기 중"
    if (!turn) {
        el.innerText = "대기 중...";
        el.style.color = "black";
        return;
    }

    // 서버는 항상 players 배열을 내려보내므로 여기서 판단 없음
    const player = players.find((p) => p.role === turn);

    // 닉네임 또는 기본 라벨
    const nickname =
        player?.nickname || (turn === "player1" ? "player1" : "player2");

    const isPlayer1 = turn === "player1";

    el.innerText = isPlayer1 ? `${nickname} (초)` : `${nickname} (한)`;

    el.style.color = isPlayer1 ? "#1e90ff" : "#c0392b";
}
