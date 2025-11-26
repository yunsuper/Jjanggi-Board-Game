export function checkWinner(board_state) {
    const p1KingAlive = board_state.pieces.player1.some(
        (p) => p.type === "king" && p.alive
    );
    const p2KingAlive = board_state.pieces.player2.some(
        (p) => p.type === "king" && p.alive
    );

    if (!p1KingAlive) return "player2"; // player2 승
    if (!p2KingAlive) return "player1"; // player1 승

    return null; // 승부 미정
}
