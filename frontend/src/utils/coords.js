// src/utils/coords.js

// ===============================
// 🔹 그리드 → 픽셀 변환
// ===============================
export const getPixelCoords = (gridX, gridY, gridConfig) => {
    const { gridTopLeftX, gridTopLeftY, tileWidth, tileHeight } = gridConfig;
    return {
        x: gridTopLeftX + gridX * tileWidth,
        y: gridTopLeftY + gridY * tileHeight,
    };
};

// ===============================
// 🔹 픽셀 → 그리드 변환
// ===============================
export const getGridCoordsFromPixels = (pixelX, pixelY, gridConfig) => {
    const { gridTopLeftX, gridTopLeftY, tileWidth, tileHeight } = gridConfig;
    return {
        x: Math.round((pixelX - gridTopLeftX) / tileWidth),
        y: Math.round((pixelY - gridTopLeftY) / tileHeight),
    };
};

// ===============================
// 🔹 스프라이트 key 결정 (UI 전용)
// 서버가 내려준 piece.owner/type 사용
// ===============================
export const getPieceAssetKey = (piece) => {
    const { type, owner } = piece;

    const prefix = owner === "player1" ? "cho" : "han";

    const map = {
        cha: "cha",
        ma: "ma",
        sang: "sang",
        sa: "sa",
        king: "wang",
        po: "po",
        byeong: "jol",
        jol: "jol",
    };

    return prefix + map[type];
};

// ===============================
// 🔹 pieceId로 owner 추론 (UI용)
// 서버가 내려준 piece.owner가 있으면 그걸 먼저 사용
// ===============================
export const getPieceOwner = (pieceId) => {
    if (pieceId.startsWith("p1")) return "player1";
    if (pieceId.startsWith("p2")) return "player2";
    return null;
};
