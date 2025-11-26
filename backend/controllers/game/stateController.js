const stateService = require("../../services/game/stateService");
const pool = require("../../db/db");

// -------------------------
// 방 생성
// -------------------------
exports.createRoom = async (req, res) => {
    try {
        console.log("🔥 createRoom req.body:", req.body);
        console.log("🔥 createRoom req.query:", req.query);

        // stateService.createRoom() 이 rooms 테이블의 row를 반환함
        const room = await stateService.createRoom();

        // ✅ 프론트가 normalizeRoom(rawRoom) 으로 그대로 쓸 수 있게 DB row 그대로 내려줌
        return res.json({ room });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "서버 오류" });
    }
};

// -------------------------
// 방 입장
// -------------------------
exports.joinRoom = async (req, res) => {
    try {
        const { room_id, player_id, nickname } = req.body;

        // 서비스에서 { room, role } 구조로 반환하도록 해둠
        const { room, role } = await stateService.joinRoom(
            room_id,
            player_id,
            nickname
        );

        // ✅ 프론트에서는 { room, role } 구조를 그대로 받는다.
        //    room 은 DB row 그대로, role 은 "player1" | "player2"
        return res.json({ room, role });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "서버 오류" });
    }
};

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
        console.error(err);
        res.status(500).json({ message: "서버 오류" });
    }
};


// -------------------------
// 게임 저장
// -------------------------
exports.saveGame = async (req, res) => {
    try {
        const { room_id } = req.params;
        const { board_state, turn, current_player } = req.body;

        await stateService.saveGame(room_id, board_state, turn, current_player);
        return res.json({ message: "게임 저장 완료" });
    } catch (err) {
        console.error(err);
        if (err.code === "INVALID_TURN") {
            return res.status(400).json({
                message: "잘못된 턴입니다. 상대 턴입니다!",
            });
        }

        return res.status(500).json({ message: "서버 오류" });
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
        console.error(err);
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
        console.error(err);
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
        console.error(err);
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
        console.error(err);
        res.status(500).json({ message: "서버 오류" });
    }
};
