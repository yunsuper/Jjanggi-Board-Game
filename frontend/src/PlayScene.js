// src/PlayScene.js
import Phaser from "phaser";
import { v4 as uuidv4 } from "uuid";

import {
    movePiece,
    renderBoard,
    selectPiece,
    updateBoardState,
} from "./services/boardService.js";
import { startPolling, stopPolling } from "./services/pollingService.js";
import { startReplay } from "./services/replayService.js";
import {
    createRoom,
    joinRoom,
    leaveRoom,
    resetGame,
} from "./services/roomService.js";

import { bindDomEvents, showNicknameModal } from "./ui/domController.js";
import { updateTurnUI } from "./ui/turnUI.js";
import { getPixelCoords } from "./utils/coords.js";

class PlayScene extends Phaser.Scene {
    constructor() {
        super("PlayScene");

        this.room = { id: null, players: [] };
        this.board_state = null;

        this.selectedPieceId = null;
        this.movablePositions = [];
        this.selectedSprite = null;

        this.isBoardReady = false;
        this.debug = false;
    }

    preload() {
        this.load.image("wood", "/wood.png");
        this.load.image("board", "/board.png");
        // ✅ 초 (player1)
        this.load.image("chocha", "/pieces/chocha.png");
        this.load.image("chojol", "/pieces/chojol.png");
        this.load.image("choma", "/pieces/choma.png");
        this.load.image("chopo", "/pieces/chopo.png");
        this.load.image("chosa", "/pieces/chosa.png");
        this.load.image("chosang", "/pieces/chosang.png");
        this.load.image("chowang", "/pieces/chowang.png");

        // ✅ 한 (player2)
        this.load.image("hancha", "/pieces/hancha.png");
        this.load.image("hanjol", "/pieces/hanjol.png");
        this.load.image("hanma", "/pieces/hanma.png");
        this.load.image("hanpo", "/pieces/hanpo.png");
        this.load.image("hansa", "/pieces/hansa.png");
        this.load.image("hansang", "/pieces/hansang.png");
        this.load.image("hanwang", "/pieces/hanwang.png");
    }

    async create() {
        const scene = this; // 🔥 this 보호 (제일 중요!)
        window.scene = scene;
        scene.pieceSpriteMap = {};

        // ✅ 테스트용 함수 등록
        window.killKing = async () => {
            if (!scene.board_state) return;

            const newPieces = scene.board_state.pieces.player2.filter(
                (p) => p.type !== "king"
            );

            const newState = {
                ...scene.board_state,
                pieces: {
                    ...scene.board_state.pieces,
                    player2: newPieces,
                },
            };

            updateBoardState(scene, newState);

            console.log("✅ player2 king removed for test");

            // ✅ 서버에도 저장 → polling에서 덮어쓰지 않도록
            await fetch(`/api/game/${scene.room.id}/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ board_state: newState }),
            });
        };

        const { width, height } = this.sys.game.config;

        /* -------------------------------------------------
         🎉 승리 모달 버튼 이벤트 (create내에서 1번만 설정)
        --------------------------------------------------- */
        document
            .querySelector("#result-newgame-btn")
            ?.addEventListener("click", async () => {
                if (scene.room.id) {
                    const state = await resetGame(scene.room.id);
                    updateBoardState(scene, state);
                }
                document
                    .querySelector("#game-result-modal")
                    ?.classList.remove("show");
            });

        document
            .querySelector("#result-replay-btn")
            ?.addEventListener("click", () => {
                startReplay(scene);
                document
                    .querySelector("#game-result-modal")
                    ?.classList.remove("show");
            });

        document
            .querySelector("#result-exit-btn")
            ?.addEventListener("click", async () => {
                if (scene.room.id) {
                    await leaveRoom(scene.room.id, scene.playerId);
                }
                stopPolling(scene);

                scene.room = { id: null, players: [] };
                scene.board_state = null;
                renderBoard(scene);
                updateTurnUI(null);

                document.getElementById("room-id").innerText = "-";

                document
                    .querySelector("#game-result-modal")
                    ?.classList.remove("show");
            });

            document
                .querySelector("#replay-end-close-btn")
                ?.addEventListener("click", () => {
                    document
                        .querySelector("#replay-end-modal")
                        ?.classList.remove("show");
                });

        /* -------------------------------------------------
         고유 플레이어 ID 설정
        --------------------------------------------------- */
        this.playerId = localStorage.getItem("myPlayerId");
        if (!this.playerId) {
            this.playerId = uuidv4();
            localStorage.setItem("myPlayerId", this.playerId);
        }

        /* -------------------------------------------------
         배경 + 보드 렌더링
        --------------------------------------------------- */
        const bg = this.add.image(0, 0, "wood").setOrigin(0, 0).setDepth(-1); // ✅ 보드 뒤로 보내기

        const board = this.add.image(width / 2, height / 2, "board");
        board.setInteractive();

        const scale =
            Math.min(width / board.width, height / board.height) * 0.9;
        board.setScale(scale);

        // ✅ 친구 코드 방식으로 좌표 계산
        const boardPaddingX = 50; // 친구가 PNG 만들 때 기준으로 쓴 값
        const boardPaddingY = 30;

        const scaledPaddingX = boardPaddingX * scale;
        const scaledPaddingY = boardPaddingY * scale;

        const gridTopLeftX = (width - board.displayWidth) / 2 + scaledPaddingX;
        const gridTopLeftY =
            (height - board.displayHeight) / 2 + scaledPaddingY;

        const gridWidth = board.displayWidth - scaledPaddingX * 2;
        const gridHeight = board.displayHeight - scaledPaddingY * 2;

        this.gridConfig = {
            gridTopLeftX,
            gridTopLeftY,
            tileWidth: gridWidth / 8,
            tileHeight: gridHeight / 9,
        };

        const copyBtn = document.getElementById("copy-room-id-btn");

        copyBtn?.addEventListener("click", () => {
            const id = document.getElementById("room-id").innerText;

            if (!id || id === "-") return;

            navigator.clipboard.writeText(id);

            copyBtn.innerText = "✅ 복사됨!";
            setTimeout(() => (copyBtn.innerText = "복사"), 1200);
        });

        /* -------------------------------------------------
         DOM 이벤트 연결
        --------------------------------------------------- */
        bindDomEvents({
            scene,
            createRoom: async () => {
                const room = await createRoom();
                scene.room = room;

                document.getElementById("room-id").innerText = room.id;
                document.querySelector("#join-room-input").value = room.id;

                showNicknameModal();
            },
            joinRoom: async (roomId, playerId, nickname) => {
                const { room, role } = await joinRoom(
                    roomId,
                    playerId,
                    nickname
                );

                scene.room = room;
                scene.role = role;

                document.getElementById("room-id").innerText = room.id;

                const state = await resetGame(room.id);
                updateBoardState(scene, state);

                scene.isBoardReady = true;
                startPolling(scene);
            },
            leaveRoom: async () => {
                await leaveRoom(scene.room.id, scene.playerId);
                stopPolling(scene);

                scene.room = { id: null, players: [] };
                scene.board_state = null;
                renderBoard(scene);
                updateTurnUI(null);
                document.getElementById("room-id").innerText = "-";
            },
            resetGame: async () => {
                if (!scene.room.id) return;
                const state = await resetGame(scene.room.id);
                updateBoardState(scene, state);
            },
            replay: async () => startReplay(scene),
        });

        /* -------------------------------------------------
         보드 클릭 → 이동
        --------------------------------------------------- */
        board.on("pointerdown", (pointer) => {
            if (!scene.isBoardReady) return;
            if (!scene.selectedPieceId) return;

            movePiece(scene, pointer, scene.selectedPieceId);
            scene.movablePositions = [];
            scene.drawMovableMarkers();
        });

        /* -------------------------------------------------
         기물 클릭 → 선택 + 확대
        --------------------------------------------------- */
        this.input.on("gameobjectdown", async (pointer, obj) => {
            if (!scene.isBoardReady) return;
            if (!obj.id) return;

            // ✅ 이전 선택된 기물 원래 크기로 복귀
            if (scene.selectedSprite) {
                scene.selectedSprite.setDisplaySize(
                    scene.gridConfig.tileWidth * 0.95,
                    scene.gridConfig.tileHeight * 0.95
                );
                scene.selectedSprite = null;
            }

            // ✅ 다른 기물 클릭 시 선택 해제
            if (scene.selectedPieceId && obj.id !== scene.selectedPieceId) {
                scene.selectedPieceId = null;
                scene.movablePositions = [];
                scene.drawMovableMarkers();
            }

            await selectPiece(scene, obj.id);
            scene.drawMovableMarkers();

            // ✅ 선택된 기물 강조 (살짝 확대)
            obj.setDisplaySize(
                scene.gridConfig.tileWidth * 1.05,
                scene.gridConfig.tileHeight * 1.05
            );
            scene.selectedSprite = obj;
        });
    }

    /* -------------------------------------------------
     이동 가능 범위 표시
    --------------------------------------------------- */
    drawMovableMarkers() {
        if (this.movableMarkers) {
            this.movableMarkers.forEach((m) => m.destroy());
        }

        if (!this.movablePositions || this.movablePositions.length === 0) {
            this.movableMarkers = [];
            return;
        }

        this.movableMarkers = this.movablePositions.map((pos) => {
            const pixel = getPixelCoords(pos.x, pos.y, this.gridConfig);
            const radius = this.gridConfig.tileWidth * 0.22;
            const marker = this.add
                .rectangle(
                    pixel.x,
                    pixel.y,
                    this.gridConfig.tileWidth * 0.65,
                    this.gridConfig.tileHeight * 0.65,
                    0x4b7bec,
                    0.18
                )
                .setOrigin(0.5);

            marker.setStrokeStyle(3, 0x4b7bec, 0.9);
            marker.setBlendMode(Phaser.BlendModes.ADD);
            marker.setDepth(5);

            // ✅ pulsing 효과 추가
            this.tweens.add({
                targets: marker,
                scaleX: 1.15,
                scaleY: 1.15,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
            });
            
            return marker;
        });
    }

    /* -------------------------------------------------
     승리 모달 표시
    --------------------------------------------------- */
    showGameResultModal(winner) {
        const modal = document.querySelector("#game-result-modal");
        const title = document.querySelector("#result-title");

        if (winner === this.role) {
            title.innerText = "🎉 승리했습니다!";
            title.style.color = "#1e90ff";
        } else {
            title.innerText = "💀 패배했습니다!";
            title.style.color = "#c0392b";
        }

        modal.classList.add("show");
    }

    showReplayEndModal() {
        const modal = document.querySelector("#replay-end-modal");
        modal.classList.add("show");
    }
}

export default PlayScene;
