// controllers/rulesController.js
const rulesEngine = require("../../services/game/rulesEngine");

exports.getMovablePositions = (req, res) => {
    try {
        const { piece, board_state, playerId } = req.body;

        if (!piece || !board_state) {
            console.warn("⚠ movable 요청 누락:", { piece, board_state });
            return res.status(400).json({ movablePositions: [] });
        }

        // 🔥 1단계: 상대 말 movable 요청 차단
        if (piece.owner !== playerId) {
            console.warn("⛔ 상대 기물 movable 요청 차단:", {
                requestBy: playerId,
                pieceOwner: piece.owner,
            });
            return res.json({ movablePositions: [] });
        }

        const position = { x: piece.x, y: piece.y };

        console.log("🔥 movable 요청 데이터:", {
            piece,
            position,
            board_state,
        });

        const moves = rulesEngine.getMovablePositions(
            piece,
            position,
            board_state
        );

        return res.json({
            movablePositions: Array.isArray(moves) ? moves : [],
        });
    } catch (err) {
        console.error("movable API ERROR:", err);
        return res.status(500).json({
            error: "서버 내부 오류",
            movablePositions: [],
        });
    }
};
