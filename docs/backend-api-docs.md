## 1. 서버 기본정보
```
BASE_URL = http://localhost:3000/api/game
```

모든 API는 /api/game/... 아래에 존재함.
## 2. 백엔드 폴더 구조 (최신)
```
backend/
│
├── controllers/
│   └── game/
│       ├── stateController.js      # 방 생성/입장/나가기/저장/로드/리셋
│       ├── historyController.js    # 히스토리 조회
│       ├── rulesController.js      # 이동 가능 좌표(movable)
│       └── pieceController.js      # 말 상태 조회
│
├── services/
│   └── game/
│       ├── stateService.js         # DB 기반 게임 상태 관리
│       ├── historyService.js       # 턴 기록
│       ├── rulesEngine.js          # 장기 이동 규칙 엔진
│       └── defaultPieces.json      # 초기 기물 배치
│
├── routes/
│   └── gameRouter.js               # 모든 라우팅
│
├── db/
│   ├── db.js                       # MariaDB 커넥션
│   └── init.sql                    # rooms / game_state / game_history 테이블
│
└── server.js
```
## 3. API 상세 설명 (최신 버전)
### 📌 3.1 방 생성 — POST /rooms/create
✔ 요청

없음.

✔ 응답
```
{
  "room": {
    "id": "uuid",
    "status": "waiting",
    "players": []
  }
}
```
### 📌 3.2 방 입장 — POST /rooms/join

닉네임 포함하여 방에 참가.

✔ Body
```
{
  "room_id": "uuid",
  "player_id": "uuid",
  "nickname": "단아"
}
```
✔ 응답
```
{
  "room": {
    "id": "uuid",
    "status": "playing",
    "players": [
      { "role": "player1", "id": "xxx", "nickname": "백양" },
      { "role": "player2", "id": "yyy", "nickname": "단아" }
    ]
  },
  "role": "player2"
}
```

### 📌 3.3 게임 저장 — POST /:room_id/save

기물 이동 후 최신 상태 저장 + 히스토리 기록됨.

✔ Body
```
{
  "board_state": {
    "turn": "player1",
    "pieces": { ... }
  }
}
```
✔ 응답
```
{
  "message": "게임 저장 완료"
}
```

※ 잘못된 턴 체크는 현재 버전에서 제거됨
(프론트 UI에서 턴을 제어함)

### 📌 3.4 게임 로드 — GET /:room_id/load

폴링(Polling)에서 사용됨.

✔ 응답
```
{
  "board_state": { ... },
  "turn": "player2",
  "players": [
    { "role": "player1", "id": "xxx", "nickname": "백양" },
    { "role": "player2", "id": "yyy", "nickname": "단아" }
  ],
  "updated_at": "2025-11-22 14:01:00"
}
```

### 📌 3.5 게임 초기화 — POST /:room_id/reset

기물을 defaultPieces.json 기준으로 완전 초기화.

✔ 응답
```
{
  "turn": "player1",
  "pieces": {
    "player1": [...],
    "player2": [...]
  }
}
```

### 📌 3.6 이동 가능 좌표 계산 — POST /movable

Rules Engine 기반.

✔ Body
```
{
  "piece": { ...팅 },
  "position": { "x": 4, "y": 9 },
  "board_state": { ... 전체 상태 ... }
}
```
✔ 응답
```
{
  "movablePositions": [
    { "x": 4, "y": 8 },
    { "x": 5, "y": 9 }
  ]
}
```

### 📌 3.7 말 상태 조회 — GET /pieces-status

혹은 방 기준 조회:

GET /pieces-status?room_id=abcd-1234

✔ 응답
```
[
  {
    "room_id": "abcd-1234",
    "board_state": { ... },
    "turn": "player1",
    "updated_at": "2025-11-22 12:21:11"
  }
]
```

### 📌 3.8 게임 히스토리 조회 — GET /:room_id/replay
✔ 응답
```
[
  {
    "turn": "player1",
    "board_state": { ... },
    "current_player": "player1",
    "created_at": "2025-11-22 14:11:06"
  },
  ...
]
```

### 📌 3.9 방 나가기 — POST /:room_id/leave
✔ Body
```
{
  "player_id": "uuid"
}
```
✔ 응답
```
{ "message": "플레이어가 방에서 나갔습니다." }
```

프론트는 pollingService가 player 수 감소를 감지해서
opponent-left-modal을 띄움.

### 📌 3.10 방 삭제 — DELETE /rooms/:room_id
✔ 응답
```
{ "message": "방 삭제 완료" }
```

## 4. 프론트 API 호출 예시 (최신 버전)
게임 저장
```
await fetch(`/api/game/${roomId}/save`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    board_state: newState,   // 최신 이동 결과
  }),
});
```
이동 가능 좌표 조회
```
const res = await fetch("/api/game/movable", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    piece,
    position: { x: piece.x, y: piece.y },
    board_state: scene.board_state
  }),
});
const data = await res.json();
scene.movablePositions = data.movablePositions;
```