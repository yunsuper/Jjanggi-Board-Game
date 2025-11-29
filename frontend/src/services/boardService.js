// src/services/boardService.js
import { getGridCoordsFromPixels, getPixelCoords } from "../utils/coords.js";
import ErrorHandler from "../utils/errorHandler.js";
import { updateTurnUI } from "../ui/turnUI.js";
import { getPieceAssetKey } from "../utils/coords.js";

//
// -------------------------------
//  상태 업데이트 (서버 응답만 반영)
// -------------------------------
export function updateBoardState(scene, newState) {
    if (!newState) return;

    scene.board_state = newState;
    renderBoard(scene);
    updateTurnUI(scene.board_state.turn, scene.room.players);
}

//
// -------------------------------
//  보드 렌더링 (그리기만 함)
// -------------------------------
export function renderBoard(scene) {
    if (!scene.board_state || !scene.board_state.pieces) return;

    const { player1, player2 } = scene.board_state.pieces;
    if (!player1 || !player2) return;

    // 기존 스프라이트 제거
    if (scene.pieceSpriteMap) {
        Object.values(scene.pieceSpriteMap).forEach((obj) => {
            obj.sprite.destroy();
        });
    }
    scene.pieceSpriteMap = {};

    const all = [...player1, ...player2];

    all.forEach((piece) => {
        if (!piece.alive) return;

        const pixel = getPixelCoords(piece.x, piece.y, scene.gridConfig);
        const textureKey = getPieceAssetKey(piece);

        const sprite = scene.add.image(pixel.x, pixel.y, textureKey);

        // 타일 크기에 맞게만 조정 (디자인 로직)
        sprite.setDisplaySize(
            scene.gridConfig.tileWidth * 1.1,
            scene.gridConfig.tileHeight * 1.1
        );

        sprite.setOrigin(0.5);
        sprite.setInteractive();
        sprite.setDepth(10);
        sprite.id = piece.id;

        sprite.boardPosition = { x: piece.x, y: piece.y };

        // 🔥 🔥 🔥 기물별 크기 조절 (복구한 부분)
        switch (piece.type) {
            case "king":
                sprite.setScale(0.92);
                break;

            case "cha":
                sprite.setScale(0.84);
                break;

            case "ma":
            case "sang":
                sprite.setScale(0.88);
                break;

            case "sa":
                sprite.setScale(0.84);
                break;

            case "po":
                sprite.setScale(0.88);
                break;

            case "byeong":
            case "jol":
                sprite.setScale(0.8);
                break;

            default:
                sprite.setScale(0.9);
        }

        if (scene.debug) {
            console.log(
                "🟥 RENDER SPRITE:",
                piece.id,
                "pixel=",
                pixel,
                "asset=",
                textureKey
            );
        }

        scene.pieceSpriteMap[piece.id] = { sprite };
    });
}

//
// -------------------------------
//  기물 클릭 → 서버에 movable 요청만
// -------------------------------
export async function selectPiece(scene, pieceId) {
    try {
        if (!scene.board_state || !scene.board_state.pieces) return;

        const all = [
            ...scene.board_state.pieces.player1,
            ...scene.board_state.pieces.player2,
        ];
        const piece = all.find((p) => p.id === pieceId);
        if (!piece) return;

        console.log("📌 movable 보내는 데이터:", {
            piece,
            board_state: scene.board_state,
            playerId: scene.playerRole,
        });

        const res = await fetch("/api/game/movable", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                piece,
                board_state: scene.board_state,
                playerId: scene.playerRole, // ✔ 누가 요청했는지만 넘김
            }),
        });

        const data = await res.json();

        // 서버가 계산한 결과만 사용
        scene.movablePositions = data.movablePositions || [];
        scene.selectedPieceId = pieceId;
    } catch (err) {
        ErrorHandler.handleUnexpectedError("selectPiece", err);
    }
}

//
// -------------------------------
//  말 이동 → 서버에 move 요청만
// -------------------------------
export async function movePiece(scene, pointer, pieceId) {
    const id = pieceId || scene.selectedPieceId;
    if (!id) return;

    // ✔ 어디로 클릭했는지만 좌표로 바꿔서 서버에 넘김
    const target = getGridCoordsFromPixels(
        pointer.x,
        pointer.y,
        scene.gridConfig
    );

    try {
        const res = await fetch(`/api/game/${scene.room.id}/move`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pieceId: id,
                toX: target.x,
                toY: target.y,
                playerId: scene.playerRole, // ✔ 내가 누구인지
            }),
        });

        const data = await res.json();
        console.log("🎯 move API 응답:", data);

        // ✔ 성공 여부/룰 검증은 서버가 판단
        if (!data.success) {
            console.warn("❌ 이동 실패:", data.error);
            return;
        }

        // 🔥🔥🔥 resultForRequester 기반 분기 (승/패/계속)
        if (data.resultForRequester === "YOU_WIN") {
            scene.showGameResultModal("YOU_WIN");
            return;
        }

        if (data.resultForRequester === "YOU_LOSE") {
            scene.showGameResultModal("YOU_LOSE");
            return;
        }

        // 서버가 내려준 최신 상태만 반영
        updateBoardState(scene, data.board);
        
        scene.room.players = data.players ?? scene.room.players;
        scene.selectedPieceId = null;
        scene.movablePositions = [];
    } catch (err) {
        ErrorHandler.handleUnexpectedError("movePiece", err);
    }
}
