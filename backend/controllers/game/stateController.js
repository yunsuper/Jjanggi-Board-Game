// controllers/game/stateController.js
const stateService = require("../../services/game/stateService");
const pool = require("../../db/db");

// -------------------------
// 방 생성
// -------------------------
exports.createRoom = async (req, res) => {
    try {
        console.log("🔥 createRoom req.body:", req.body);
        console.log("🔥 createRoom req.query:", req.query);

        const room = await stateService.createRoom();

        return res.json({
            room: {
                id: room.room_id,
                status: room.status,
                player1_id: room.player1_id,
                player2_id: room.player2_id,
                player1_nickname: room.player1_nickname,
                player2_nickname: room.player2_nickname,
            },
        });
    } catch (err) {
        console.error("❌ createRoom Error:", err);
        return res.status(500).json({ message: "서버 오류" });
    }
};

// -------------------------
// 방 입장
// -------------------------
exports.joinRoom = async (req, res) => {
    try {
        const { room_id, player_id, nickname } = req.body;

        const { room, role } = await stateService.joinRoom(
            room_id,
            player_id,
            nickname
        );

        return res.json({
            room: {
                id: room.room_id,
                ...room,
            },
            role,
        });
    } catch (err) {
        console.error("❌ joinRoom Error:", err);
        return res.status(500).json({ message: "서버 오류" });
    }
};

// -------------------------
// 상태 업데이트
// -------------------------
exports.updateStatus = async (req, res) => {
    try {
        const { room_id } = req.params;
        const { status } = req.body;

        await pool.query(`UPDATE rooms SET status = ? WHERE room_id = ?`, [
            status,
            room_id,
        ]);

        const [[room]] = await pool.query(
            `SELECT room_id, player1_id, player2_id, player1_nickname, player2_nickname, status
             FROM rooms WHERE room_id = ?`,
            [room_id]
        );

        return res.json({
            id: room.room_id,
            status: room.status,
            players: [
                {
                    role: "player1",
                    id: room.player1_id,
                    nickname: room.player1_nickname,
                },
                {
                    role: "player2",
                    id: room.player2_id,
                    nickname: room.player2_nickname,
                },
            ],
        });
    } catch (err) {
        console.error("❌ updateStatus Error:", err);
        res.status(500).json({ message: "서버 오류" });
    }
};

// -------------------------
// 게임 로드
// -------------------------
exports.loadGame = async (req, res) => {
    try {
        const { room_id } = req.params;
        const result = await stateService.loadGame(room_id);
        return res.json(result);
    } catch (err) {
        console.error("❌ loadGame Error:", err);
        res.status(500).json({ message: "서버 오류" });
    }
};

// -------------------------
// 게임 초기화
// -------------------------
exports.resetGame = async (req, res) => {
    try {
        const { room_id } = req.params;
        const result = await stateService.resetGame(room_id);
        return res.json(result);
    } catch (err) {
        console.error("❌ resetGame Error:", err);
        res.status(500).json({ message: "서버 오류" });
    }
};

// -------------------------
// 방 나가기
// -------------------------
exports.leaveRoom = async (req, res) => {
    try {
        const { room_id } = req.params;
        const { player_id } = req.body;

        await stateService.leaveRoom(room_id, player_id);
        return res.json({ message: "플레이어 퇴장 완료" });
    } catch (err) {
        console.error("❌ leaveRoom Error:", err);
        res.status(500).json({ message: "서버 오류" });
    }
};

// -------------------------
// 방 삭제
// -------------------------
exports.deleteRoom = async (req, res) => {
    try {
        const { room_id } = req.params;
        await stateService.deleteRoom(room_id);
        return res.json({ message: "방 삭제 완료" });
    } catch (err) {
        console.error("❌ deleteRoom Error:", err);
        res.status(500).json({ message: "서버 오류" });
    }
};

// -------------------------
// 말 이동
// -------------------------
exports.move = async (req, res) => {
    try {
        const { room_id } = req.params;
        const { pieceId, toX, toY, playerId } = req.body;

        console.log("🔥 /move 요청", {
            room_id,
            pieceId,
            toX,
            toY,
            playerId,
        });

        const result = await stateService.movePiece(
            room_id,
            pieceId,
            toX,
            toY,
            playerId
        );

        console.log("✅ movePiece 결과", result);

        // 규칙 위반, NOT_YOUR_TURN, INVALID_MOVE 같은 것도 다 여기로 내려옴
        return res.json(result);
    } catch (err) {
        console.error("❌ move Error:", err);
        return res.status(500).json({
            success: false,
            message: "서버 오류",
        });
    }
};
