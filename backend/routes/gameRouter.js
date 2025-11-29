const express = require("express");
const router = express.Router();

// 개별 import
const stateController = require("../controllers/game/stateController");
const historyController = require("../controllers/game/historyController");
const rulesController = require("../controllers/game/rulesController");

// Movable
router.post("/movable", rulesController.getMovablePositions);

// Rooms
router.post("/rooms/create", stateController.createRoom);
router.post("/rooms/join", stateController.joinRoom);
router.get("/:room_id/load", stateController.loadGame);
router.post("/:room_id/reset", stateController.resetGame);
router.post("/:room_id/leave", stateController.leaveRoom);
router.post("/:room_id/status", stateController.updateStatus);
router.post("/:room_id/move", stateController.move);

// History
router.get("/:room_id/replay", historyController.replayGame);

module.exports = router;
