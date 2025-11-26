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

    const isEnemy = (target) => target && target.owner !== piece.owner;

    switch (piece.type) {
        case "ma": {
            const legMoves = [
                { leg: [0, -1], move: [-1, -2] },
                { leg: [0, -1], move: [1, -2] },
                { leg: [0, 1], move: [-1, 2] },
                { leg: [0, 1], move: [1, 2] },
                { leg: [-1, 0], move: [-2, -1] },
                { leg: [-1, 0], move: [-2, 1] },
                { leg: [1, 0], move: [2, -1] },
                { leg: [1, 0], move: [2, 1] },
            ];

            legMoves.forEach(({ leg, move }) => {
                const legX = x + leg[0];
                const legY = y + leg[1];
                const nx = x + move[0];
                const ny = y + move[1];

                if (!inBounds(nx, ny)) return;
                if (findPieceAt(legX, legY)) return;

                const target = findPieceAt(nx, ny);
                if (!target || isEnemy(target)) moves.push({ x: nx, y: ny });
            });
            break;
        }

        case "sang": {
            const legMoves = [
                { leg: [0, -1], move: [-2, -2] },
                { leg: [0, -1], move: [2, -2] },
                { leg: [0, 1], move: [-2, 2] },
                { leg: [0, 1], move: [2, 2] },
            ];

            legMoves.forEach(({ leg, move }) => {
                const legX = x + leg[0];
                const legY = y + leg[1];
                const nx = x + move[0];
                const ny = y + move[1];

                if (!inBounds(nx, ny)) return;
                if (findPieceAt(legX, legY)) return;

                const target = findPieceAt(nx, ny);
                if (!target || isEnemy(target)) moves.push({ x: nx, y: ny });
            });
            break;
        }

        case "cha": {
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
                    const target = findPieceAt(nx, ny);

                    if (!target) {
                        moves.push({ x: nx, y: ny });
                        nx += dx;
                        ny += dy;
                    } else {
                        if (isEnemy(target)) moves.push({ x: nx, y: ny });
                        break;
                    }
                }
            });
            break;
        }

        case "po": {
            const dirs = [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ];

            dirs.forEach(([dx, dy]) => {
                let nx = x + dx;
                let ny = y + dy;

                let jumped = false;

                while (inBounds(nx, ny)) {
                    const target = findPieceAt(nx, ny);

                    if (!jumped) {
                        if (target) jumped = true;
                        nx += dx;
                        ny += dy;
                    } else {
                        if (target) {
                            if (isEnemy(target)) moves.push({ x: nx, y: ny });
                            break;
                        }
                        nx += dx;
                        ny += dy;
                    }
                }
            });
            break;
        }

        case "byeong":
        case "jol": {
            const isPlayer1 = piece.owner === "player1";
            const dy = isPlayer1 ? -1 : 1;

            const fx = x;
            const fy = y + dy;

            if (inBounds(fx, fy)) {
                const t = findPieceAt(fx, fy);
                if (!t || isEnemy(t)) moves.push({ x: fx, y: fy });
            }

            const crossedRiver =
                (isPlayer1 && y <= 4) || (!isPlayer1 && y >= 5);

            if (crossedRiver) {
                [
                    { x: x - 1, y },
                    { x: x + 1, y },
                ].forEach((s) => {
                    if (!inBounds(s.x, s.y)) return;
                    const t = findPieceAt(s.x, s.y);
                    if (!t || isEnemy(t)) moves.push(s);
                });
            }
            break;
        }

        case "sa": {
            const palaceX = [3, 4, 5];
            const palaceY = piece.owner === "player1" ? [7, 8, 9] : [0, 1, 2];

            const diag = [
                [1, 1],
                [1, -1],
                [-1, 1],
                [-1, -1],
            ];

            diag.forEach(([dx, dy]) => {
                const nx = x + dx;
                const ny = y + dy;

                if (!palaceX.includes(nx) || !palaceY.includes(ny)) return;

                const t = findPieceAt(nx, ny);
                if (!t || isEnemy(t)) moves.push({ x: nx, y: ny });
            });
            break;
        }

        case "king": {
            const palaceX = [3, 4, 5];
            const palaceY = piece.owner === "player1" ? [7, 8, 9] : [0, 1, 2];

            const dirs = [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ];

            dirs.forEach(([dx, dy]) => {
                const nx = x + dx;
                const ny = y + dy;

                if (!palaceX.includes(nx) || !palaceY.includes(ny)) return;

                const t = findPieceAt(nx, ny);
                if (!t || isEnemy(t)) moves.push({ x: nx, y: ny });
            });
            break;
        }
    }

    return moves;
};
