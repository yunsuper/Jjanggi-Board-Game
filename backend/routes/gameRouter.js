const express = require("express");
const router = express.Router();

// 개별 import
const stateController = require("../controllers/game/stateController");
const historyController = require("../controllers/game/historyController");
const rulesController = require("../controllers/game/rulesController");
const pieceController = require("../controllers/game/pieceController");

// Movable
router.post("/movable", rulesController.getMovablePositions);

// Rooms
router.post("/rooms/create", stateController.createRoom);
router.post("/rooms/join", stateController.joinRoom);
router.post("/:room_id/save", stateController.saveGame);
router.get("/:room_id/load", stateController.loadGame);
router.post("/:room_id/reset", stateController.resetGame);
router.post("/:room_id/leave", stateController.leaveRoom);
router.post("/:room_id/status", stateController.updateStatus);

// History
router.get("/:room_id/replay", historyController.replayGame);

// Pieces
router.get("/pieces-status", pieceController.getPieceStatus);

module.exports = router;
