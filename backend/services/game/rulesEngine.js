// backend/services/game/rulesEngine.js

exports.getMovablePositions = (piece, position, board_state) => {
    const { x, y } = position;
    const moves = [];

    const inBounds = (nx, ny) => nx >= 0 && nx < 9 && ny >= 0 && ny < 10;

    const allPieces = [
        ...board_state.pieces.player1,
        ...board_state.pieces.player2,
    ];

    const findPieceAt = (tx, ty) =>
        allPieces.find((p) => p.x === tx && p.y === ty && p.alive !== false);

    // 🔹 
    const currentTurnOwner = piece.owner;
    const isEnemy = (target) => target && target.owner !== currentTurnOwner;

    const isEmptyOrEnemy = (nx, ny) => {
        const t = findPieceAt(nx, ny);
        return !t || isEnemy(t);
    };

    // ------------------------------
    // 🔥 공통: 궁(팔래스) 체크
    // ------------------------------
    const palaceX = [3, 4, 5];
    const palaceY = piece.owner === "player1" ? [7, 8, 9] : [0, 1, 2];
    const inPalace = (nx, ny) => palaceX.includes(nx) && palaceY.includes(ny);

    // ------------------------------
    // 🔥 KING — 8방향 이동
    // ------------------------------
    if (piece.type === "king") {
        const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
        ];
        dirs.forEach(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            if (!inBounds(nx, ny)) return;
            if (!inPalace(nx, ny)) return;
            const t = findPieceAt(nx, ny);
            if (!t || isEnemy(t)) moves.push({ x: nx, y: ny });
        });
        return moves;
    }

    // ------------------------------
    // 🔥 SA(士) — King과 동일 8방향
    // ------------------------------
    if (piece.type === "sa") {
        const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
        ];
        dirs.forEach(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            if (!inBounds(nx, ny)) return;
            if (!inPalace(nx, ny)) return;
            if (isEmptyOrEnemy(nx, ny)) moves.push({ x: nx, y: ny });
        });
        return moves;
    }

    // ------------------------------
    // 🔥 SANG(象) — 직선1칸 + 대각2칸 (3칸 룰)
    // ------------------------------
    if (piece.type === "sang") {
        const routes = [
            { leg1: [0, -1], leg2: [1, -2], dest: [2, -3] },
            { leg1: [0, -1], leg2: [-1, -2], dest: [-2, -3] },
            { leg1: [0, 1], leg2: [1, 2], dest: [2, 3] },
            { leg1: [0, 1], leg2: [-1, 2], dest: [-2, 3] },
            { leg1: [1, 0], leg2: [2, -1], dest: [3, -2] },
            { leg1: [1, 0], leg2: [2, 1], dest: [3, 2] },
            { leg1: [-1, 0], leg2: [-2, -1], dest: [-3, -2] },
            { leg1: [-1, 0], leg2: [-2, 1], dest: [-3, 2] },
        ];
        routes.forEach((r) => {
            const b1x = x + r.leg1[0];
            const b1y = y + r.leg1[1];
            if (!inBounds(b1x, b1y)) return;
            if (findPieceAt(b1x, b1y)) return;
            const b2x = x + r.leg2[0];
            const b2y = y + r.leg2[1];
            if (!inBounds(b2x, b2y)) return;
            if (findPieceAt(b2x, b2y)) return;
            const nx = x + r.dest[0];
            const ny = y + r.dest[1];
            if (!inBounds(nx, ny)) return;
            if (isEmptyOrEnemy(nx, ny)) moves.push({ x: nx, y: ny });
        });
        return moves;
    }

    // ------------------------------
    // 🔥 CHA(車) — 직선 무한 + 막힘
    // ------------------------------
    if (piece.type === "cha") {
        const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ];
        dirs.forEach(([dx, dy]) => {
            let nx = x + dx;
            let ny = y + dy;
            while (inBounds(nx, ny)) {
                const t = findPieceAt(nx, ny);
                if (!t) moves.push({ x: nx, y: ny });
                else {
                    if (isEnemy(t)) moves.push({ x: nx, y: ny });
                    break;
                }
                nx += dx;
                ny += dy;
            }
        });
        return moves;
    }

    // ------------------------------
    // 🔥 PO(包) — 뛰어서 먹기
    // ------------------------------
    if (piece.type === "po") {
        const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ];
        dirs.forEach(([dx, dy]) => {
            let nx = x + dx,
                ny = y + dy;
            let jumped = false;
            while (inBounds(nx, ny)) {
                const t = findPieceAt(nx, ny);
                if (!jumped) {
                    if (t) jumped = true;
                    nx += dx;
                    ny += dy;
                } else {
                    if (t) {
                        if (isEnemy(t)) moves.push({ x: nx, y: ny });
                        break;
                    }
                    nx += dx;
                    ny += dy;
                }
            }
        });
        return moves;
    }

    // ------------------------------
    // 🔥 BYEONG/JOL — 앞 + 좌우, 후진 금지
    // ------------------------------
    if (piece.type === "byeong" || piece.type === "jol") {
        // 현재 턴 기준으로 방향 설정
        const dy = piece.owner === "player1" ? -1 : 1;

        // 앞 이동
        const fx = x;
        const fy = y + dy;
        if (inBounds(fx, fy) && isEmptyOrEnemy(fx, fy))
            moves.push({ x: fx, y: fy });

        // 좌우 이동
        const sideMoves = [
            [x - 1, y],
            [x + 1, y],
        ];
        sideMoves.forEach(([nx, ny]) => {
            if (inBounds(nx, ny) && isEmptyOrEnemy(nx, ny))
                moves.push({ x: nx, y: ny });
        });

        return moves;
    }

    return moves;
};
