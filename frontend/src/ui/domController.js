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

    // 기존 방 입장 (Room ID 입력 후)
    document.querySelector("#join-room-btn")?.addEventListener("click", () => {
        const roomId = document.querySelector("#join-room-input").value.trim();

        if (!roomId) {
            alert("방 번호를 입력해주세요.");
            return;
        }

        showNicknameModal(); // roomId 필요없음
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

            if (!nickname) return; // nickname만 검사

            if (!roomId || roomId.trim() === "") {
                alert("방 ID가 비어 있습니다.");
                return;
            }

            joinRoom(roomId, scene.playerId, nickname);

            // 입력값 정리
            document.querySelector("#nickname-input").value = "";
            hideNicknameModal();
        });

    // 다시하기
    document.querySelector(".new-game")?.addEventListener("click", resetGame);

    // 리플레이
    document.querySelector(".replay-game")?.addEventListener("click", replay);

    // 나가기
    document.querySelector(".leave-game")?.addEventListener("click", leaveRoom);

    // 창 닫기: leaveRoom 호출
    window.addEventListener("beforeunload", () => {
        if (scene?.room?.id && scene?.playerId) {
            leaveRoom(scene.room.id, scene.playerId);
        }
    });

    // 상대방 나감 팝업 확인 버튼
    const opponentLeftOkBtn = document.querySelector("#opponent-left-ok");
    opponentLeftOkBtn?.addEventListener("click", () => {
        const modal = document.querySelector("#opponent-left-modal");
        modal?.classList.remove("show");
    });
}

export function showNicknameModal() {
    const modal = document.querySelector("#nickname-modal");
    modal?.classList.add("show");
    document.querySelector("#nickname-input")?.focus();
}

export function hideNicknameModal() {
    document.querySelector("#nickname-modal")?.classList.remove("show");
}

// 결과 모달 버튼들
document.querySelector("#restart-btn")?.addEventListener("click", resetGame);
document.querySelector("#replay-btn")?.addEventListener("click", replay);
