const pool = require("../../db/db");
const { v4: uuidv4 } = require("uuid");


let lastLoadLog = 0;
// -------------------------
// 방 생성
// -------------------------
exports.createRoom = async () => {
    const roomId = uuidv4();

    // 방 생성
    await pool.query(
        `INSERT INTO rooms (room_id, status) VALUES (?, 'waiting')`,
        [roomId]
    );

    // 생성 직후 DB에서 실제 방 정보 SELECT (DB row)
    const [[room]] = await pool.query(`SELECT * FROM rooms WHERE room_id = ?`, [
        roomId,
    ]);

    // ✅ DB row 그대로 반환
    return room;
};

// -------------------------
// 방 입장 + 닉네임 저장 + 상태 업데이트
// -------------------------
exports.joinRoom = async (roomId, playerId, nickname) => {
    const [[room]] = await pool.query(`SELECT * FROM rooms WHERE room_id = ?`, [
        roomId,
    ]);

    if (!room) throw new Error("방 없음");

    let role = null;

    if (!room.player1_id) {
        await pool.query(
            `UPDATE rooms SET player1_id=?, player1_nickname=? WHERE room_id=?`,
            [playerId, nickname, roomId]
        );
        role = "player1";
    } else if (!room.player2_id) {
        await pool.query(
            `UPDATE rooms SET player2_id=?, player2_nickname=? WHERE room_id=?`,
            [playerId, nickname, roomId]
        );
        role = "player2";

        // 두 명 다 찼으면 상태를 playing 으로 변경
        await pool.query(`UPDATE rooms SET status='playing' WHERE room_id=?`, [
            roomId,
        ]);
    } else {
        // 이미 2명 다 찬 방
        throw new Error("방 꽉참");
    }

    // 지금 방 최신 정보 SELECT (DB row 그대로)
    const [[updatedRoom]] = await pool.query(
        `SELECT * FROM rooms WHERE room_id = ?`,
        [roomId]
    );

    // ✅ 컨트롤러에서 그대로 내려줄 수 있도록 room + role 반환
    return { room: updatedRoom, role };
};



// -------------------------
// 게임 저장
// -------------------------
exports.saveGame = async (roomId, boardState) => {
    console.log("🔥 [SAVE GAME] 요청 도착");
    console.log("roomId:", roomId);
    console.log("boardState(요약):", {
        turn: boardState.turn,
        piecesP1: boardState.pieces.player1.length,
        piecesP2: boardState.pieces.player2.length,
    });
    // 현재 턴 가져오기
    const [[state]] = await pool.query(
        `SELECT turn FROM game_state WHERE room_id = ?`,
        [roomId]
    );

    let currentTurn = state ? state.turn : null;

    // 🔥 정상적으로 turn이 없을 수 있는 경우는 없음
    // resetGame()에서 이미 turn="player1"로 저장되기 때문
    if (!currentTurn) {
        currentTurn = "player1"; // 안전장치
    }

    // 🔥 nextTurn은 항상 서버에서 계산
    const nextTurn = currentTurn === "player1" ? "player2" : "player1";

    // 🔥 board_state는 그 냥 저장
    await pool.query(
        `UPDATE game_state 
         SET board_state = ?, turn = ?
         WHERE room_id = ?`,
        [JSON.stringify(boardState), nextTurn, roomId]
    );

    // 기록 저장
    await pool.query(
        `INSERT INTO game_history (room_id, turn, board_state, current_player)
         VALUES (?, ?, ?, ?)`,
        [roomId, nextTurn, JSON.stringify(boardState), currentTurn]
    );
};

// -------------------------
// 게임 로드
// -------------------------
exports.loadGame = async (roomId) => {
    // 📌 콘솔 도배 방지 (2분마다 1회만 출력)
    const now = Date.now();
    if (now - lastLoadLog > 120000) {
        console.log("📥 [LOAD GAME] 요청 도착 — roomId:", roomId);
        lastLoadLog = now;
    }

    // 🔥 rooms 테이블에서 플레이어 정보도 불러오기
    const [[room]] = await pool.query(
        `SELECT player1_id, player2_id, player1_nickname, player2_nickname
         FROM rooms WHERE room_id = ?`,
        [roomId]
    );

    // 🔥 game_state 가져오기
    const [rows] = await pool.query(
        `SELECT * FROM game_state WHERE room_id = ?`,
        [roomId]
    );

    if (!rows.length) throw new Error("저장 없음");

    // ------------------------
    // 🔥 players 배열 생성
    // ------------------------
    const players = [];

    if (room.player1_id) {
        players.push({
            id: room.player1_id,
            nickname: room.player1_nickname,
            role: "player1",
        });
    }

    if (room.player2_id) {
        players.push({
            id: room.player2_id,
            nickname: room.player2_nickname,
            role: "player2",
        });
    }

    // ------------------------
    // 🔥 프론트에서 바로 사용 가능하도록 통합 응답
    // ------------------------
    return {
        board_state: JSON.parse(rows[0].board_state),
        turn: rows[0].turn,
        updated_at: rows[0].updated_at,
        players, // 🔥 플레이어 데이터 추가됨
    };
};

// -------------------------
// 게임 리셋
// -------------------------
exports.resetGame = async (roomId) => {
    const defaultPieces = require("./defaultPieces.json");

    // 1) defaultState 구성
    const defaultState = {
        turn: "player1",
        pieces: {
            player1: defaultPieces.player1.map((p) => ({ ...p })),
            player2: defaultPieces.player2.map((p) => ({ ...p })),
        },
    };

    // 2) game_state 테이블에 roomId가 존재하는지 확인
    const [rows] = await pool.query(
        `SELECT room_id FROM game_state WHERE room_id = ?`,
        [roomId]
    );

    if (rows.length === 0) {
        // 3) 존재하지 않으면 INSERT
        await pool.query(
            `INSERT INTO game_state (room_id, board_state, turn)
             VALUES (?, ?, ?)`,
            [roomId, JSON.stringify(defaultState), defaultState.turn]
        );
    } else {
        // 4) 존재하면 UPDATE
        await pool.query(
            `UPDATE game_state
             SET board_state = ?, turn = ?
             WHERE room_id = ?`,
            [JSON.stringify(defaultState), defaultState.turn, roomId]
        );
    }

    // 5) 프론트에서 그대로 받아서 updateBoardState() 쓸 수 있게 반환
    return defaultState; 
};

// -------------------------
// 방 나가기
// -------------------------
exports.leaveRoom = async (roomId, playerId) => {
    const [[room]] = await pool.query(`SELECT * FROM rooms WHERE room_id = ?`, [
        roomId,
    ]);

    if (!room) throw new Error("방 없음");

    let columnToUpdate = null;
    let nicknameToUpdate = null;

    if (room.player1_id === playerId) {
        columnToUpdate = "player1_id";
        nicknameToUpdate = "player1_nickname";
    }
    if (room.player2_id === playerId) {
        columnToUpdate = "player2_id";
        nicknameToUpdate = "player2_nickname";
    }

    if (!columnToUpdate) throw new Error("플레이어가 방에 없음");

    // 해당 자리 비우기
    await pool.query(
        `UPDATE rooms 
         SET ${columnToUpdate} = NULL, ${nicknameToUpdate} = NULL
         WHERE room_id = ?`,
        [roomId]
    );

    // 다른 플레이어가 남아있으면 상태 waiting
    const [[updatedRoom]] = await pool.query(
        `SELECT player1_id, player2_id FROM rooms WHERE room_id = ?`,
        [roomId]
    );

    if (!updatedRoom.player1_id && !updatedRoom.player2_id) {
        // 아무도 없으면 방 삭제
        await pool.query(`DELETE FROM rooms WHERE room_id = ?`, [roomId]);
    } else {
        // 한 명이라도 있으면 대기 상태로 변경
        await pool.query(
            `UPDATE rooms SET status = 'waiting' WHERE room_id = ?`,
            [roomId]
        );
    }
};

// -------------------------
// 방 삭제
// -------------------------
exports.deleteRoom = async (roomId) => {
    const [rows] = await pool.query(`SELECT * FROM rooms WHERE room_id = ?`, [
        roomId,
    ]);

    if (!rows.length) throw new Error("방 없음");

    await pool.query(`DELETE FROM rooms WHERE room_id = ?`, [roomId]);
};
