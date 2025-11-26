const historyService = require("../../services/game/historyService");

exports.replayGame = async (req, res) => {
    try {
        const { room_id } = req.params;
        const result = await historyService.getHistory(room_id);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "서버 오류" });
    }
};
