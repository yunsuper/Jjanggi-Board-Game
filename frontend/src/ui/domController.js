// src/ui/domController.js

export function bindDomEvents({
    scene,
    createRoom,
    joinRoom,
    leaveRoom,
    resetGame,
    replay,
}) {
    // 새 방 생성
    document
        .querySelector(".create-room")
        ?.addEventListener("click", createRoom);

    // 기존 방 입장 버튼
    document.querySelector("#join-room-btn")?.addEventListener("click", () => {
        const roomId = document.querySelector("#join-room-input").value.trim();

        if (!roomId) {
            alert("방 번호를 입력해주세요.");
            return;
        }

        // 방 ID는 이미 input 안에 있으므로 닉네임 모달만 열기
        showNicknameModal();
    });

    // 닉네임 입력 제출
    document
        .querySelector("#nickname-form")
        ?.addEventListener("submit", (e) => {
            e.preventDefault();

            const nickname = document
                .querySelector("#nickname-input")
                .value.trim();
            const roomId = document
                .querySelector("#join-room-input")
                .value.trim();

            if (!nickname) return;
            if (!roomId) {
                alert("방 ID가 비어 있습니다.");
                return;
            }

            joinRoom(roomId, scene.playerId, nickname);

            document.querySelector("#nickname-input").value = "";
            hideNicknameModal();
        });

    // 다시하기
    document.querySelector(".new-game")?.addEventListener("click", async () => {
        if (!scene.room?.id) return;
        await resetGame(scene.room.id); // PlayScene 핸들러 호출됨
    });

    // 리플레이
    document.querySelector(".replay-game")?.addEventListener("click", replay);

    // 방 나가기
    document.querySelector(".leave-game")?.addEventListener("click", leaveRoom);

    // 창 닫힘 → leaveRoom 호출
    window.addEventListener("beforeunload", () => {
        if (scene?.room?.id && scene?.playerId) {
            leaveRoom(scene.room.id, scene.playerId);
        }
    });

    // 상대방 나감 팝업 OK 버튼
    const opponentLeftOkBtn = document.querySelector("#opponent-left-ok");
    opponentLeftOkBtn?.addEventListener("click", () => {
        const modal = document.querySelector("#opponent-left-modal");
        modal?.classList.remove("show");
    });

    // ===========================
    // 🔥 리플레이 종료 모달 OK 버튼
    // ===========================
    const replayEndOkBtn = document.querySelector("#replay-end-close-btn");
    replayEndOkBtn?.addEventListener("click", () => {
        const modal = document.querySelector("#replay-end-modal");
        modal?.classList.remove("show");

        // 🔥 클릭 다시 허용
        document.querySelector("#game-container").style.pointerEvents = "auto";

        if (window.scene) {
            window.scene.blockPieceClick = false;
        }
    });

    // ===========================
    // 🔥 승리 모달 버튼 이벤트
    // ===========================
    const resultModal = document.getElementById("game-result-modal");

    document
        .querySelector("#result-newgame-btn")
        ?.addEventListener("click", () => {
            resultModal.classList.remove("show");
            document.body.style.pointerEvents = "auto";
            resetGame();
        });

    document
        .querySelector("#result-replay-btn")
        ?.addEventListener("click", () => {
            resultModal.classList.remove("show");
            document.body.style.pointerEvents = "auto";
            replay();
        });

    document
        .querySelector("#result-exit-btn")
        ?.addEventListener("click", () => {
            resultModal.classList.remove("show");
            document.body.style.pointerEvents = "auto";
            leaveRoom();
        });
}

// 모달 열기
export function showNicknameModal() {
    const modal = document.querySelector("#nickname-modal");
    modal?.classList.add("show");
    document.querySelector("#nickname-input")?.focus();
}

// 닫기
export function hideNicknameModal() {
    document.querySelector("#nickname-modal")?.classList.remove("show");
}

// ================================
// 🔥 승리 모달 표시 함수
// ================================
export function showGameResultModal(result) {
    const modal = document.getElementById("game-result-modal");
    const title = document.getElementById("result-title");

    if (!modal || !title) {
        console.error("❌ 승리 모달 요소 없음!");
        return;
    }

    // ============================
    // 🔥 결과 문구 처리
    // ============================
    if (result === "YOU_WIN") {
        title.innerText = "🏆 승리했습니다!";
    } else if (result === "YOU_LOSE") {
        title.innerText = "패배했습니다.";
    } else if (result === "player1") {
        title.innerText = "🏆 초(파랑팀) 승리!";
    } else if (result === "player2") {
        title.innerText = "🏆 한(빨강팀) 승리!";
    } else {
        title.innerText = "게임 종료";
    }

    // 모달 띄우기
    modal.classList.add("show");

    // 게임 입력 막기
    document.body.style.pointerEvents = "none";
    modal.style.pointerEvents = "auto";
}
