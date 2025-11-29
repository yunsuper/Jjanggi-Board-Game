// backend/services/game/stateService.js
const pool = require("../../db/db");
const { v4: uuidv4 } = require("uuid");

let lastLoadLog = 0;

// -------------------------
// 방 생성
// -------------------------
exports.createRoom = async () => {
    const roomId = uuidv4();
    await pool.query(
        `INSERT INTO rooms (room_id, status) VALUES (?, 'waiting')`,
        [roomId]
    );
    const [[room]] = await pool.query(`SELECT * FROM rooms WHERE room_id = ?`, [
        roomId,
    ]);
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
        await pool.query(`UPDATE rooms SET status='playing' WHERE room_id=?`, [
            roomId,
        ]);
    } else {
        throw new Error("방 꽉참");
    }

    const [[updatedRoom]] = await pool.query(
        `SELECT * FROM rooms WHERE room_id = ?`,
        [roomId]
    );

    return { room: updatedRoom, role };
};

// -------------------------
// 게임 저장
// -------------------------
exports.saveGame = async (roomId, boardState) => {
    const [[state]] = await pool.query(
        `SELECT turn FROM game_state WHERE room_id = ?`,
        [roomId]
    );

    const currentTurn = state ? state.turn : "player1";
    const nextTurn = currentTurn === "player1" ? "player2" : "player1";

    await pool.query(
        `UPDATE game_state SET board_state = ?, turn = ? WHERE room_id = ?`,
        [JSON.stringify(boardState), nextTurn, roomId]
    );

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
    const now = Date.now();
    if (now - lastLoadLog > 120000) lastLoadLog = now;

    const [[room]] = await pool.query(
        `SELECT player1_id, player2_id, player1_nickname, player2_nickname
     FROM rooms WHERE room_id = ?`,
        [roomId]
    );

    const [rows] = await pool.query(
        `SELECT * FROM game_state WHERE room_id = ?`,
        [roomId]
    );

    if (!rows.length) throw new Error("저장 없음");

    const players = [];
    if (room.player1_id)
        players.push({
            id: room.player1_id,
            nickname: room.player1_nickname,
            role: "player1",
        });
    if (room.player2_id)
        players.push({
            id: room.player2_id,
            nickname: room.player2_nickname,
            role: "player2",
        });

    const parsed = JSON.parse(rows[0].board_state);

    // 🔥 핵심: board_state.turn을 DB.turn으로 강제 통일
    const unifiedBoardState = {
        ...parsed,
        turn: rows[0].turn,
    };

    return {
        board_state: unifiedBoardState, // 🔥 parsed 사용
        turn: rows[0].turn,
        updated_at: rows[0].updated_at,
        players,
        winner: parsed.winner || null, // 🔥 parsed 사용
    };
};

// -------------------------
// 게임 리셋
// -------------------------
exports.resetGame = async (roomId) => {
    const defaultPieces = require("./defaultPieces.json");

    const defaultState = {
        turn: "player1",
        pieces: {
            player1: defaultPieces.player1.map((p) => ({ ...p })),
            player2: defaultPieces.player2.map((p) => ({ ...p })),
        },
    };

    const [rows] = await pool.query(
        `SELECT room_id FROM game_state WHERE room_id = ?`,
        [roomId]
    );

    if (rows.length === 0) {
        await pool.query(
            `INSERT INTO game_state (room_id, board_state, turn) VALUES (?, ?, ?)`,
            [roomId, JSON.stringify(defaultState), defaultState.turn]
        );
    } else {
        await pool.query(
            `UPDATE game_state SET board_state = ?, turn = ? WHERE room_id = ?`,
            [JSON.stringify(defaultState), defaultState.turn, roomId]
        );
    }

    return defaultState;
};

// ---------------------------
// 말 이동 + 턴 검증 + 승리 판단
// ---------------------------
exports.movePiece = async (roomId, pieceId, toX, toY, playerId) => {
    // 1) 현재 게임 상태 가져오기
    const [[state]] = await pool.query(
        `SELECT board_state, turn FROM game_state WHERE room_id = ?`,
        [roomId]
    );
    if (!state) throw new Error("게임 상태 없음");

    // 2) 방 정보에서 UUID → player1/player2 매핑
    const [[room]] = await pool.query(
        `SELECT player1_id, player2_id FROM rooms WHERE room_id = ?`,
        [roomId]
    );
    if (!room) throw new Error("방 없음");

    let role = null; // "player1" 또는 "player2"
    if (room.player1_id === playerId) role = "player1";
    else if (room.player2_id === playerId) role = "player2";

    // 🔥 여기 추가
    console.log("🧩 movePiece 내부 상태", {
        roomId,
        pieceId,
        toX,
        toY,
        playerId,
        dbPlayer1: room.player1_id,
        dbPlayer2: room.player2_id,
        role,
        turn: state.turn,
    });

    if (!role) {
        console.log("❌ NOT_IN_ROOM");
        // 이 방에 속해 있지 않은 사람
        return { success: false, error: "NOT_IN_ROOM" };
    }

    // 3) 턴 검증 (game_state.turn 은 "player1"/"player2")
    if (state.turn && state.turn !== role) {
        console.log("❌ NOT_YOUR_TURN");
        return { success: false, error: "NOT_YOUR_TURN" };
    }

    // 4) board_state 파싱
    let board_state;
    try {
        board_state =
            typeof state.board_state === "string"
                ? JSON.parse(state.board_state)
                : state.board_state;
    } catch (err) {
        console.error("❌ board_state JSON 파싱 에러:", err);
        throw new Error("보드 상태를 불러올 수 없습니다.");
    }

    // 5) 전체 기물 리스트
    const allPieces = [
        ...board_state.pieces.player1,
        ...board_state.pieces.player2,
    ];

    const piece = allPieces.find((p) => p.id === pieceId);

    if (!piece) {
        console.log("❌ PIECE_NOT_FOUND");
        return { success: false, error: "PIECE_NOT_FOUND" };
    }

    // owner는 "player1" / "player2" 여야 함
    if (piece.owner !== role) {
        console.log("❌ NOT_YOUR_PIECE", { pieceOwner: piece.owner, role });
        return { success: false, error: "NOT_YOUR_PIECE" };
    }

    if (piece.alive === false) {
        console.log("❌ PIECE_DEAD");
        return { success: false, error: "PIECE_DEAD" };
    }

    // 6) 이동 가능 위치 계산 (룰 엔진은 백엔드에서만 사용)
    const { getMovablePositions } = require("./rulesEngine");

    const from = { x: piece.x, y: piece.y };
    const movable = getMovablePositions(piece, from, board_state);

    const canMove = movable.some((pos) => pos.x === toX && pos.y === toY);
    if (!canMove) {
        console.log("❌ INVALID_MOVE", { movable, toX, toY });
        return { success: false, error: "INVALID_MOVE" };
    }

    // 7) 상대 말이 있으면 잡기
    const target = allPieces.find(
        (p) => p.x === toX && p.y === toY && p.alive !== false
    );
    if (target && target.owner !== role) {
        target.alive = false;
    }

    // 8) 말 좌표 업데이트
    piece.x = toX;
    piece.y = toY;

    // 9) 승패 판정 (왕이 죽었는지 확인)
    const p1KingAlive = board_state.pieces.player1.some(
        (p) => p.type === "king" && p.alive !== false
    );
    const p2KingAlive = board_state.pieces.player2.some(
        (p) => p.type === "king" && p.alive !== false
    );

    let winner = null;
    if (!p1KingAlive) winner = "player2";
    if (!p2KingAlive) winner = "player1";

    // 10) 다음 턴 계산 
    let nextTurn = null;

    nextTurn = role === "player1" ? "player2" : "player1";

    board_state.turn = nextTurn;
    board_state.winner = winner;

    // 11) DB에 저장
    await pool.query(
        `UPDATE game_state SET board_state = ?, turn = ? WHERE room_id = ?`,
        [JSON.stringify(board_state), nextTurn, roomId]
    );

    await pool.query(
        `INSERT INTO game_history (room_id, turn, board_state, current_player)
         VALUES (?, ?, ?, ?)`,
        [roomId, nextTurn, JSON.stringify(board_state), role]
    );

    let resultForRequester = "GAME_CONTINUE";

    if (winner) {
        if (winner === role) {
            resultForRequester = "YOU_WIN";
        } else {
            resultForRequester = "YOU_LOSE";
        }
    }

    console.log("🎯 요청자 결과:", resultForRequester);

    console.log("✅ 이동 성공, 다음 턴:", nextTurn);
    // 12) 프론트로 응답 (프론트는 그냥 이거 받아서 렌더만 하면 됨)
    return {
        success: true,
        board: {
            ...board_state,
            turn: nextTurn, // 🔥 DB.turn 넣어서 프론트도 DB만 믿게 만든다
        },
        nextTurn,
        winner,
        resultForRequester,
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
    };
};


// -------------------------
// 방 나가기
// -------------------------
exports.leaveRoom = async (roomId, playerId) => {
    const [[room]] = await pool.query(
        `SELECT player1_id, player2_id FROM rooms WHERE room_id = ?`,
        [roomId]
    );

    if (!room) throw new Error("방 없음");

    // player1이 나가면 null 처리
    if (room.player1_id === playerId) {
        await pool.query(
            `UPDATE rooms SET player1_id = NULL, player1_nickname = NULL, status='waiting' WHERE room_id = ?`,
            [roomId]
        );
    }

    // player2가 나가면 null 처리
    if (room.player2_id === playerId) {
        await pool.query(
            `UPDATE rooms SET player2_id = NULL, player2_nickname = NULL, status='waiting' WHERE room_id = ?`,
            [roomId]
        );
    }

    // 만약 두 명 다 없으면 자동 삭제
    const [[updated]] = await pool.query(
        `SELECT player1_id, player2_id FROM rooms WHERE room_id = ?`,
        [roomId]
    );

    if (!updated.player1_id && !updated.player2_id) {
        await pool.query(`DELETE FROM rooms WHERE room_id = ?`, [roomId]);
        // game_state, game_history는 CASCADE 로 같이 삭제됨
    }

    return true;
};