// ✅ 좌표 변환 — 기존 그대로 사용
export const getPixelCoords = (gridX, gridY, gridConfig) => {
    const { gridTopLeftX, gridTopLeftY, tileWidth, tileHeight } = gridConfig;
    return {
        x: gridTopLeftX + gridX * tileWidth,
        y: gridTopLeftY + gridY * tileHeight,
    };
};

export const getGridCoordsFromPixels = (pixelX, pixelY, gridConfig) => {
    const { gridTopLeftX, gridTopLeftY, tileWidth, tileHeight } = gridConfig;
    const x = Math.round((pixelX - gridTopLeftX) / tileWidth);
    const y = Math.round((pixelY - gridTopLeftY) / tileHeight);
    return { x, y };
};

// ✅ 새 PNG 전용 — 최종 확정 버전
export const getPieceAssetKey = (piece) => {
    const { type, owner } = piece;

    // player1 = 초(cho), player2 = 한(han)
    const prefix = owner === "player1" ? "cho" : "han";

    const map = {
        cha: "cha",
        ma: "ma",
        sang: "sang",
        sa: "sa",
        king: "wang",
        po: "po",
        byeong: "jol", // ✅ 병/졸 동일 PNG
        jol: "jol",
    };

    return prefix + map[type];
};

// ✅ 그대로 유지 (pieceId 기반 owner 판별)
export const getPieceOwner = (pieceId) => {
    if (/^p1/.test(pieceId)) return "player1";
    if (/^p2/.test(pieceId)) return "player2";
    return "unknown";
};
