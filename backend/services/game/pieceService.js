const pool = require("../../db/db");

exports.getPieceStatus = async (roomId) => {
    let rows;

    if (roomId) {
        [rows] = await pool.query(
            `SELECT room_id, board_state, turn, updated_at
             FROM game_state
             WHERE room_id = ?`,
            [roomId]
        );
    } else {
        [rows] = await pool.query(
            `SELECT room_id, board_state, turn, updated_at
             FROM game_state`
        );
    }

    if (!rows.length) throw new Error("데이터 없음");

    return rows.map((r) => ({
        room_id: r.room_id,
        board_state: JSON.parse(r.board_state),
        turn: r.turn,
        updated_at: r.updated_at,
    }));
};
