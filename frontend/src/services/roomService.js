// src/services/roomService.js
import ErrorHandler from "../utils/errorHandler.js";

// DB row → 프론트에서 쓰기 좋은 형태로 변환
function normalizeRoom(rawRoom = {}) {
    const players = [];

    if (rawRoom.player1_id) {
        players.push({
            id: rawRoom.player1_id,
            nickname: rawRoom.player1_nickname || "",
            role: "player1",
        });
    }

    if (rawRoom.player2_id) {
        players.push({
            id: rawRoom.player2_id,
            nickname: rawRoom.player2_nickname || "",
            role: "player2",
        });
    }

    return {
        id: rawRoom.id ?? rawRoom.room_id ?? null,
        status: rawRoom.status || "waiting",
        players,
    };
}

export async function createRoom() {
    try {
        const res = await fetch("/api/game/rooms/create", {
            method: "POST",
        });
        const data = await res.json();

        return normalizeRoom(data.room);
    } catch (err) {
        ErrorHandler.handleUnexpectedError("createRoom", err);
        return null;
    }
}

export async function joinRoom(room_id, player_id, nickname) {
    try {
        const res = await fetch("/api/game/rooms/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id, player_id, nickname }),
        });

        const data = await res.json();
        return data; // room 그대로 + role 그대로
    } catch (err) {
        ErrorHandler.handleUnexpectedError("joinRoom", err);
        return null;
    }
}


export async function leaveRoom(roomId, playerId) {
    try {
        await fetch(`/api/game/${roomId}/leave`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player_id: playerId }),
        });
    } catch (err) {
        ErrorHandler.handleUnexpectedError("leaveRoom", err);
    }
}

export async function resetGame(roomId) {
    try {
        const res = await fetch(`/api/game/${roomId}/reset`, {
            method: "POST",
        });
        return await res.json();
    } catch (err) {
        ErrorHandler.handleUnexpectedError("resetGame", err);
        return null;
    }
}
