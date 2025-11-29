// src/PlayScene.js
import Phaser from "phaser";
import { v4 as uuidv4 } from "uuid";

import {
    renderBoard,
    updateBoardState,
    selectPiece,
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
import { showGameResultModal } from "./ui/domController.js";

class PlayScene extends Phaser.Scene {
    constructor() {
        super("PlayScene");

        this.room = { id: null, players: [] };
        this.board_state = null;

        this.selectedPieceId = null;
        this.movablePositions = [];
        this.selectedSprite = null;

        this.isBoardReady = false;
    }

    showReplayEndModal() {
        const modal = document.querySelector("#replay-end-modal");
        if (modal) modal.classList.add("show");
        document.querySelector("#game-container").style.pointerEvents = "none";

        this.blockPieceClick = true;
    }

    preload() {
        this.load.image("wood", "/wood.png");
        this.load.image("board", "/board.png");

        // player1 (초)
        this.load.image("chocha", "/pieces/chocha.png");
        this.load.image("chojol", "/pieces/chojol.png");
        this.load.image("choma", "/pieces/choma.png");
        this.load.image("chopo", "/pieces/chopo.png");
        this.load.image("chosa", "/pieces/chosa.png");
        this.load.image("chosang", "/pieces/chosang.png");
        this.load.image("chowang", "/pieces/chowang.png");

        // player2 (한)
        this.load.image("hancha", "/pieces/hancha.png");
        this.load.image("hanjol", "/pieces/hanjol.png");
        this.load.image("hanma", "/pieces/hanma.png");
        this.load.image("hanpo", "/pieces/hanpo.png");
        this.load.image("hansa", "/pieces/hansa.png");
        this.load.image("hansang", "/pieces/hansang.png");
        this.load.image("hanwang", "/pieces/hanwang.png");
    }

    async create() {
        const scene = this;
        window.scene = scene;
        scene.pieceSpriteMap = {};

        // 🔥 모달 표시 함수 연결
        scene.showGameResultModal = showGameResultModal;

        const { width, height } = this.sys.game.config;

        // 플레이어 UUID 생성
        this.playerId = localStorage.getItem("myPlayerId");
        if (!this.playerId) {
            this.playerId = uuidv4();
            localStorage.setItem("myPlayerId", this.playerId);
        }

        /* -------------------------------------------------
         보드 배치
        --------------------------------------------------- */
        this.add.image(0, 0, "wood").setOrigin(0, 0).setDepth(-1);

        const board = this.add
            .image(width / 2, height / 2, "board")
            .setInteractive();

        const scale =
            Math.min(width / board.width, height / board.height) * 0.9;
        board.setScale(scale);

        const paddingX = 50 * scale;
        const paddingY = 30 * scale;

        const gridTopLeftX = (width - board.displayWidth) / 2 + paddingX;
        const gridTopLeftY = (height - board.displayHeight) / 2 + paddingY;

        this.gridConfig = {
            gridTopLeftX,
            gridTopLeftY,
            tileWidth: (board.displayWidth - paddingX * 2) / 8,
            tileHeight: (board.displayHeight - paddingY * 2) / 9,
        };

        /* -------------------------------------------------
         방 ID 복사 버튼 (PlayScene 전용, 여기에만 존재해야 정상 작동함)
        --------------------------------------------------- */
        const copyBtn = document.getElementById("copy-room-id-btn");

        if (copyBtn) {
            copyBtn.addEventListener("click", async () => {
                const roomIdText = document
                    .getElementById("room-id")
                    ?.textContent?.trim();
                if (!roomIdText || roomIdText === "-") return;

                try {
                    await navigator.clipboard.writeText(roomIdText);
                    copyBtn.innerText = "✅ 복사됨!";
                    setTimeout(() => (copyBtn.innerText = "복사"), 1200);
                } catch (err) {
                    console.error("복사 실패:", err);
                }
            });
        }

        /* -------------------------------------------------
         DOM 이벤트 연결 (여기가 매우 중요!)
        --------------------------------------------------- */
        bindDomEvents({
            scene,

            // 방 생성
            createRoom: async () => {
                const room = await createRoom();
                if (!room || !room.id) {
                    console.error("❌ createRoom 실패: room.id 없음", room);
                    return;
                }

                scene.room = room;

                document.getElementById("room-id").innerText = room.id;
                document.querySelector("#join-room-input").value = room.id;

                showNicknameModal();
            },

            // 방 입장
            joinRoom: async (roomId, playerId, nickname) => {
                const res = await joinRoom(roomId, playerId, nickname);
                const room = res.room;
                const role = res.role;

                scene.room = {
                    id: room.id,
                    status: room.status,
                    players: room.players ?? [],
                    player1_id: room.player1_id,
                    player2_id: room.player2_id,
                };
                scene.role = role;
                scene.playerRole = role;

                document.getElementById("room-id").innerText = room.id;

                const state = await resetGame(room.id);
                updateBoardState(scene, state);

                scene.isBoardReady = true;
                startPolling(scene);
            },

            // 나가기
            leaveRoom: async () => {
                if (scene.room.id)
                    await leaveRoom(scene.room.id, scene.playerId);

                stopPolling(scene);
                scene.room = { id: null };
                scene.board_state = null;

                renderBoard(scene);
                updateTurnUI(null);
                document.getElementById("room-id").innerText = "-";
            },

            // 초기화
            resetGame: async () => {
                if (!scene.room.id) return;

                const state = await resetGame(scene.room.id);
                updateBoardState(scene, state);
                scene.isBoardReady = true;
            },

            replay: async () => startReplay(scene),
        });

        /* -------------------------------------------------
         보드 클릭 -> 이동 요청
        --------------------------------------------------- */
        board.on("pointerdown", async (pointer) => {
            if (!scene.room?.id) {
                console.error("❌ move 요청 실패: room.id 없음");
                return;
            }
            if (!scene.isBoardReady || !scene.selectedPieceId) return;

            const { x, y } = pointer;
            const gridX = Math.round(
                (x - scene.gridConfig.gridTopLeftX) / scene.gridConfig.tileWidth
            );
            const gridY = Math.round(
                (y - scene.gridConfig.gridTopLeftY) /
                    scene.gridConfig.tileHeight
            );

            console.log("📌 pointer pos", { x, y });
            console.log("📌 calc grid", { gridX, gridY });
            console.log("📌 gridConfig", scene.gridConfig);

            // 🔥 여기 추가
            console.log("🎯 이동 요청 보내기", {
                roomId: scene.room?.id,
                playerId: scene.playerId,
                playerRole: scene.playerRole,
                selectedPieceId: scene.selectedPieceId,
                toX: gridX,
                toY: gridY,
            });

            

            const res = await fetch(`/api/game/${scene.room.id}/move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pieceId: scene.selectedPieceId,
                    toX: gridX,
                    toY: gridY,
                    playerId: scene.playerId,
                    // playerId: scene.playerRole,
                }),
            });

            const data = await res.json();
            // 🔥 응답 로그
            console.log("📩 move 응답", data);

            // 🔥 winner 처리 추가
            if (data.winner) {
                console.log("🎉 승리:", data.winner);
                scene.blockPieceClick = true; // 클릭 차단
                stopPolling(scene); // 폴링 중지(선택)
                // 여기에서 winner 모달 띄우기
                scene.showGameResultModal?.(data.winner);
                return;
            }

            if (!data.success) {
                console.warn("⚠ move 실패:", data.error);
                return;
            }

            // 🔥 이동 성공 → 잠시 클릭 차단
            scene.blockPieceClick = true;
            setTimeout(() => (scene.blockPieceClick = false), 150);

            scene.board_state = data.board;
            updateBoardState(scene, data.board);

            scene.movablePositions = [];
            scene.drawMovableMarkers();
        });

        this.blockPieceClick = false;
        /* -------------------------------------------------
         기물 클릭 → movable 표시
        --------------------------------------------------- */
        this.input.on("gameobjectdown", async (_, obj) => {
            const clickedId = obj?.id;

            console.log("👆 CLICK DETECTED", {
                clickedSprite: clickedId,
                selectedBefore: scene.selectedPieceId,
                block: scene.blockPieceClick,
            });

            // 🔥 ghost click 차단
            if (scene.blockPieceClick) {
                console.log("⛔ GHOST CLICK BLOCKED");
                return;
            }

            // 준비 안 됐거나 잘못된 객체면 무시
            if (!scene.isBoardReady || !clickedId) {
                console.log("⛔ CLICK BLOCKED:", {
                    isBoardReady: scene.isBoardReady,
                    objId: clickedId,
                });
                return;
            }

            // 🔥 기물 주인 판별
            const myRole = scene.playerRole;

            const clickedOwner = clickedId.startsWith("p1")
                ? "player1"
                : "player2";

            console.log(
                "🐤 CLICKED SPRITE:",
                clickedId,
                "owner=",
                clickedOwner,
                "myRole=",
                myRole
            );

            /* 🔵 1) 아직 아무 기물도 선택되지 않은 상태 → 내 기물만 선택 가능 */
            if (!scene.selectedPieceId) {
                if (clickedOwner !== myRole) {
                    console.log("⛔ 첫 클릭으로는 상대 말 선택 불가");
                    return;
                }

                // 선택 + movable 요청
                await selectPiece(scene, clickedId);
                console.log("🟩 FIRST SELECT:", clickedId);

                if (scene.selectedSprite) {
                    scene.selectedSprite.setDisplaySize(
                        scene.gridConfig.tileWidth * 0.95,
                        scene.gridConfig.tileHeight * 0.95
                    );
                }

                obj.setDisplaySize(
                    scene.gridConfig.tileWidth * 1.05,
                    scene.gridConfig.tileHeight * 1.05
                );
                scene.selectedSprite = obj;

                scene.drawMovableMarkers();
                return;
            }

            /* 🟦 2) 이미 기물이 선택된 상태에서 → 다시 내 기물을 클릭(선택 변경) */
            if (clickedOwner === myRole) {
                await selectPiece(scene, clickedId);
                console.log("🟦 CHANGE SELECT TO:", clickedId);

                if (scene.selectedSprite) {
                    scene.selectedSprite.setDisplaySize(
                        scene.gridConfig.tileWidth * 0.95,
                        scene.gridConfig.tileHeight * 0.95
                    );
                }

                obj.setDisplaySize(
                    scene.gridConfig.tileWidth * 1.05,
                    scene.gridConfig.tileHeight * 1.05
                );
                scene.selectedSprite = obj;

                scene.drawMovableMarkers();
                return;
            }

            /* 🔥 3) 기물이 선택된 상태 + 상대 기물을 클릭 → 잡기(move) 요청 */
            if (clickedOwner !== myRole) {
                if (!obj.boardPosition) {
                    console.warn("⚠ enemy sprite에 boardPosition 없음", obj.id);
                    return;
                }

                const { x, y } = obj.boardPosition;

                console.log("⚡ CAPTURE MOVE 요청", {
                    fromPiece: scene.selectedPieceId,
                    to: { x, y },
                });

                if (!scene.room?.id) {
                    console.error("❌ capture move 실패");
                    return;
                }

                const res = await fetch(`/api/game/${scene.room.id}/move`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        pieceId: scene.selectedPieceId,
                        toX: x,
                        toY: y,
                        playerId: scene.playerId,
                    }),
                });

                const data = await res.json();
                console.log("📩 capture move 응답", data);

                if (!data.success) {
                    console.warn("⚠ capture 실패:", data.error);
                    return;
                }

                // 🔥 승리 처리
                if (data.winner) {
                    console.log("🏆 Winner:", data.winner);
                    scene.showGameResultModal?.(data.winner);
                    scene.blockPieceClick = true;
                    stopPolling(scene);
                    return;
                }

                scene.board_state = data.board;
                updateBoardState(scene, data.board);

                // 선택 해제
                scene.selectedPieceId = null;
                scene.movablePositions = [];
                scene.drawMovableMarkers();

                if (scene.selectedSprite) {
                    scene.selectedSprite.setDisplaySize(
                        scene.gridConfig.tileWidth * 0.95,
                        scene.gridConfig.tileHeight * 0.95
                    );
                }
                scene.selectedSprite = null;

                return;
            }
        });
    }

    /* -------------------------------------------------
         이동 가능 범위 나타내기
    --------------------------------------------------- */
    drawMovableMarkers() {
        if (this.movableMarkers)
            this.movableMarkers.forEach((m) => m.destroy());

        if (!this.movablePositions?.length) {
            this.movableMarkers = [];
            return;
        }

        this.movableMarkers = this.movablePositions.map((pos) => {
            const pixel = getPixelCoords(pos.x, pos.y, this.gridConfig);

            const marker = this.add
                .rectangle(
                    pixel.x,
                    pixel.y,
                    this.gridConfig.tileWidth * 0.65,
                    this.gridConfig.tileHeight * 0.65,
                    0xffffff,
                    0.2
                )
                .setOrigin(0.5)
                .setDepth(5);

            marker.disableInteractive();
            // 🔥 마커 클릭 여부 테스트용
            marker.on("pointerdown", () => {
                console.log("❌ 마커가 클릭 이벤트를 가로챔!", pos);
            });

            marker.setStrokeStyle(3, 0xffffff, 0.9);

            this.tweens.add({
                targets: marker,
                scaleX: 1.15,
                scaleY: 1.15,
                duration: 600,
                yoyo: true,
                repeat: -1,
            });

            return marker;
        });
    }
}

window.testWin = function (winner = "player1") {
    if (window.scene?.showGameResultModal) {
        window.scene.showGameResultModal(winner);
    }
};

export default PlayScene;
