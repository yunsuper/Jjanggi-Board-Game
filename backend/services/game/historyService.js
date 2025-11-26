const pool = require("../../db/db");

exports.getHistory = async (roomId) => {
    const [rows] = await pool.query(
        `SELECT id, turn, board_state, current_player, created_at
         FROM game_history
         WHERE room_id = ?
         ORDER BY id ASC`,
        [roomId]
    );

    return rows.map((r) => ({
        id: r.id,
        turn: r.turn,
        board_state: JSON.parse(r.board_state),
        current_player: r.current_player,
        created_at: r.created_at,
    }));
};
