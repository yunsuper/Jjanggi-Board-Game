// src/services/boardService.js
import { getGridCoordsFromPixels, getPixelCoords } from "../utils/coords.js";
import ErrorHandler from "../utils/errorHandler.js";
import { updateTurnUI } from "../ui/turnUI.js";
import { checkWinner } from "../utils/checkWinner.js";
import { getPieceAssetKey } from "../utils/coords.js";

//
// -------------------------------
//  상태 업데이트
// -------------------------------
export function updateBoardState(scene, newState) {
    scene.board_state = newState;
    renderBoard(scene);
    updateTurnUI(scene.board_state.turn, scene.room.players);
}

//
// -------------------------------
//  보드 렌더링
// -------------------------------
export function renderBoard(scene) {
    if (!scene.board_state) return;

    // 🔥 board_state.pieces 자체가 없는 경우 안전 처리
    if (!scene.board_state.pieces) {
        console.warn(
            "⚠ board_state.pieces 없음 — 초기화되지 않은 상태. 렌더 스킵!"
        );
        return;
    }

    const { player1, player2 } = scene.board_state.pieces;
    if (!player1 || !player2) {
        console.warn("⚠ player1 또는 player2 데이터가 없음 — 렌더 스킵!");
        return;
    }

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

        // ✅ 중앙 정렬 + 크기 조정 + 위치 보정
        const sprite = scene.add.image(
            pixel.x,
            pixel.y + scene.gridConfig.tileHeight * 0.02, // 약간 아래로 2% 이동
            textureKey
        );

        // ✅ 타일 크기에 맞춰 자동 스케일링
        sprite.setDisplaySize(
            scene.gridConfig.tileWidth * 1.1,
            scene.gridConfig.tileHeight * 1.1
        );

        sprite.setOrigin(0.5);
        sprite.setInteractive();
        sprite.setDepth(10);
        sprite.id = piece.id;

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
//  기물 클릭 → movable 조회
// -------------------------------
export async function selectPiece(scene, pieceId) {
    console.log("🔥 SELECT PIECE CALLED:", pieceId);
    const state = scene.board_state;
    if (!state) {
        console.log("❌ state 없음");
        return;
    }

    const all = [...state.pieces.player1, ...state.pieces.player2];
    const piece = all.find((p) => p.id === pieceId);
    console.log("  ↳ piece 찾음:", piece);
    if (!piece) {
        console.log("❌ piece 못 찾음");
        return;
    }

    try {
        const res = await fetch("/api/game/movable", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                piece,
                position: { x: piece.x, y: piece.y },
                board_state: state,
            }),
        });

        const data = await res.json();
        console.log("🔥 movable API 응답:", data); 
        scene.movablePositions = data.movablePositions || [];

        scene.selectedPieceId = pieceId;
    } catch (err) {
        ErrorHandler.handleUnexpectedError("selectPiece", err);
    }
}

//
// -------------------------------
//  말 이동
// -------------------------------
export async function movePiece(scene, pointer, pieceId) {
    console.log("🟦 movePiece CALLED:", pieceId);
    const id = pieceId || scene.selectedPieceId;
    if (!id) return;

    // target 먼저 계산
    const target = getGridCoordsFromPixels(
        pointer.x,
        pointer.y,
        scene.gridConfig
    );

    // 이동 가능 위치 검사
    const valid = scene.movablePositions.some(
        (p) => p.x === target.x && p.y === target.y
    );
    if (!valid) return;

    try {
        // 상태 복사
        const newState = JSON.parse(JSON.stringify(scene.board_state));
        const all = [...newState.pieces.player1, ...newState.pieces.player2];
        const piece = all.find((p) => p.id === id);
        if (!piece) return;

        // 이동
        piece.x = target.x;
        piece.y = target.y;

        // 서버 저장
        await fetch(`/api/game/${scene.room.id}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ board_state: newState }),
        });

        // UI 업데이트
        updateBoardState(scene, newState);

        // 🔥🔥🔥 승리 여부 체크 추가
        const winner = checkWinner(newState);
        if (winner) {
            console.log("🎉 Winner:", winner);

            scene.isBoardReady = false; // 게임 정지
            scene.showGameResultModal(winner); // PlayScene에서 만든 모달
        }

        // 상태 초기화
        scene.selectedPieceId = null;
        scene.movablePositions = [];
    } catch (err) {
        ErrorHandler.handleUnexpectedError("movePiece", err);
    }
}

//
// -------------------------------
//  중국 문자 맵핑
// -------------------------------
function getChinese(type) {
    const map = {
        cha: "車",
        ma: "馬",
        sang: "象",
        sa: "士",
        king: "王",
        byeong: "兵",
        jol: "卒",
        po: "包",
    };
    return map[type];
}
