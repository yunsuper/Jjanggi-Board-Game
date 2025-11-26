## 1. 서버 기본 정보
BASE_URL: http://localhost:3000/api/game

## 2. 폴더 구조
```backend/
│
├── controllers/
│   └── game/
│       ├── stateController.js
│       ├── historyController.js
│       ├── rulesController.js
│       └── pieceController.js
│   └── index.js
│
├── services/
│   └── game/
│       ├── stateService.js
│       ├── historyService.js
│       ├── rulesEngine.js
│       └── pieceService.js
│
├── routes/
│   └── gameRouter.js
│
├── db/
│   ├── db.js
│   └── init.sql
│
└── server.js
```

## 3. API 상세 설명   
### 📌 3.1 방 생성 (Room Create)
POST /rooms/create
✔ 요청

없음

✔ 응답
```
{
  "room_id": "uuid값"
}
```
### 📌 3.2 방 참가 (Join Room)
POST /rooms/join
✔ Body
```
{
  "room_id": "uuid",
  "player_id": "uuid"
}
```
✔ 응답
```
{ "role": "player1" }
```

또는
```
{ "role": "player2" }
```
### 📌 3.3 게임 저장 (Turn Save)
POST /:room_id/save
✔ Body
```
{
  "board_state": { ... },
  "turn": "player1",
  "current_player": "player1"
}
```
✔ 응답
```
// 턴이 맞으면:

{ "message": "게임 저장 완료" }

// 턴이 틀리면:

{ "message": "잘못된 턴입니다. 상대 턴입니다!" }
```
### 📌 3.4 게임 불러오기 (Load Game)
GET /:room_id/load
✔ 응답
```
{
  "board_state": { ... },
  "turn": "player1",
  "updated_at": "2025-11-17T14:04:54.000Z"
}
```
### 📌 3.5 게임 초기화 (Reset Game)
POST /:room_id/reset
✔ 응답
```
{
  "message": "게임 리셋 완료",
  "board_state": { ...초기말배치 }
}
```

### 📌 3.6 이동 가능 좌표 조회 (Rules Engine)
POST /movable
✔ Body
```
{
  "piece": { ...말정보 },
  "position": { "x": 1, "y": 9 },
  "board_state": { ...전체 보드 정보 }
}
```
✔ 응답
```
{
  "movablePositions": [
    { "x": 0, "y": 7 },
    { "x": 2, "y": 7 }
  ]
}
```

### 📌 3.7 말 상태 조회 (All Pieces)
GET /pieces-status

또는 특정 방 기준

GET /pieces-status?room_id=xxxx

✔ 응답
```
[
  {
    "room_id": "uuid",
    "board_state": { ... },
    "turn": "player1",
    "updated_at": "2025-11-17T14:00:00.000Z"
  }
]
```

### 📌 3.8 게임 히스토리 조회 (Replay)
GET /:room_id/replay
✔ 응답
```
[
  {
    "id": 1,
    "turn": "player1",
    "board_state": { ... },
    "current_player": "player1",
    "created_at": "2025-11-17T13:51:06.000Z"
  }
]
```

### 📌 3.9 방 삭제
DELETE /rooms/:room_id
✔ 응답
```
{ "message": "방 삭제 완료" }
```

## 4. 프론트에서 API 사용 예시
게임 저장
```
await fetch(`/api/game/${roomId}/save`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    board_state: board, //최신 보드 상태
    turn, // 다음 턴
    current_player // 현재 플레이어
  })
});
```

이동 가능 좌표
```
const res = await fetch("/api/game/movable", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    piece,
    position: { x, y },
    board_state
  })
});

const data = await res.json();
console.log(data.movablePositions);
```

### ✔ 프론트에서 할 일
1) 방 만들기 + 플레이어 참가 UI
2) 백엔드에서 턴 받아서 화면에서 각 플레이어 차례 표시
3) 말 클릭 → /movable 호출 → highlight
4) 이동 시 /save 호출 (자동저장 구현하고 싶다면 가능)
5) 히스토리 재생 UI