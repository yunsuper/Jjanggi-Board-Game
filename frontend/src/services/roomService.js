// src/services/roomService.js
import ErrorHandler from "../utils/errorHandler.js";

// 원본 room 데이터를 players 배열 형태로 정규화
function normalizeRoom(rawRoom) {
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
        id: rawRoom.room_id,
        status: rawRoom.status,
        players,
    };
}

export async function createRoom() {
    const res = await fetch("/api/game/rooms/create", { method: "POST" });
    const data = await res.json();

    return normalizeRoom(data.room);
}

export async function joinRoom(room_id, player_id, nickname) {
    const res = await fetch("/api/game/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id, player_id, nickname }),
    });

    const { room, role } = await res.json();

    return {
        room: normalizeRoom(room),
        role,
    };
}

export async function leaveRoom(roomId, playerId) {
    await fetch(`/api/game/${roomId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId }),
    });
}

export async function resetGame(roomId) {
    const res = await fetch(`/api/game/${roomId}/reset`, { method: "POST" });
    const data = await res.json();
    return data;
}
