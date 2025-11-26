const pieceService = require("../../services/game/pieceService");

exports.getPieceStatus = async (req, res) => {
    try {
        const { room_id } = req.query;
        const result = await pieceService.getPieceStatus(room_id);
        return res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "서버 오류" });
    }
};
