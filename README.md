# 🧩 장기 보드 게임 - Online Korean Chess

브라우저 기반의 **실시간 멀티플레이 장기 게임**입니다.

Phaser 3로 게임 화면을 렌더링하고, Node.js + MariaDB가 게임 상태·방 관리·리플레이를 처리합니다.

---

## 🚀 주요 기능

- **멀티룸 시스템** — 방 생성/입장, 닉네임 설정, 실시간 플레이
- **실시간 동기화** — 1.5초 폴링 기반 보드 상태 자동 갱신
- **장기 규칙 엔진** — 차/마/상/포/사/왕/병/졸 전체 이동 규칙 구현, 상대 기물 클릭 시 이동 불가 처리
- **기물 선택 & 이동 UI** — 활성화 영역 표시, 기물 강조 효과
- ** 승리/패배 판정 시스템 ** - 승/패 판정과 모달
- **리플레이 기능** — 히스토리 기반 전체 턴 재생
- **게임 종료 처리** — 승/패 모달, 다시하기/리플레이/나가기
- **상대방 퇴장 감지** — 자동 팝업 표시(예외 상황 처리)
- **방 번호 복사 버튼** — 공유 기능 강화
---  
## ✨게임방법

### 1) 기본 규칙
- 9×10 보드
- player1: 아래 시작
- player2: 위에서 시작
- 번갈아가며 한 턴씩 이동
- 상대 왕(장군)을 잡으면 승리

### 2) 말 종류와 이동 방식

- 차(Cha): 가로/세로 무제한 이동
- 마(Ma): 한 칸 직진 → 한 칸 대각
- 상(Sang): 한 칸 직진 → 두 칸 대각
- 포(Po): 포는 ‘말을 뛰어넘어’ 공격 가능
- 병/졸(Byeong/Jol): 앞,양옆으로 한칸씩 이동
- 사(Sa): 왕 주변 4×4 안에서 상하좌우/대각 이동
- 왕(King): 4×4 궁성 안에서 상하좌우/대각 이동

### 3) 조작 방법

- 새 방 만들기 -> 닉네임 입력 -> 방 생성 후 기물 생성
- 방 아이디로 플레이어2 같은 방 입장 가능
- 마우스로 말 클릭 → 이동 가능한 칸 표시
- 두 번째 클릭으로 이동
- 리플레이: 턴별 기록 재생
- 새 방 생성 / 방 입장 (UUID)
- 다시하기(초기화) 

### 4) 게임 기능 설명
- 멀티룸 지원
- DB에 턴별 기록 저장
- 리플레이 기능
- 현재 턴 표시

---
## 📸 스크린샷
<img width="1399" height="885" alt="스크린샷 2025-11-26 오후 4 03 36" src="https://github.com/user-attachments/assets/5c9cfcc5-b517-4976-a711-afbef8b31149" />
<img width="469" height="471" alt="스크린샷 2025-11-26 오후 4 12 15" src="https://github.com/user-attachments/assets/520bbf45-cffb-4f4c-b571-95af8820809c" />
<img width="482" height="480" alt="스크린샷 2025-11-26 오후 4 04 48" src="https://github.com/user-attachments/assets/729e9ee7-6994-46a7-b7db-d5e03885bd8e" />
<img width="618" height="713" alt="스크린샷 2025-11-26 오후 4 10 51" src="https://github.com/user-attachments/assets/9c08a096-92e7-4fb2-be5f-d9f75e9172c7" />
<img width="1396" height="877" alt="스크린샷 2025-11-26 오후 4 05 19" src="https://github.com/user-attachments/assets/8dcab8f9-02f3-40f8-b71a-0ea5404ba381" />

---

## 🧠 기술 스택

**Frontend**

- Phaser 3
- Vite
- HTML / CSS / JavaScript (ES Modules)

**Backend**

- Node.js (Express)
- MariaDB
- mysql2/promise

---

## 📁 폴더 구조

```
JJanggi/
├── backend/
│   ├── controllers/
│   ├── services/
│   ├── db/
│   └── server.js
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── PlayScene.js
    │   ├── services/
    │   ├── ui/
    │   └── utils/
    ├── index.html
    └── vite.config.js
```

---

## 🗄 Database 구조 (요약)

- **rooms** — 방 정보 및 플레이어 ID/닉네임 저장
- **game_state** — 현재 보드 상태(JSON), 턴 정보
- **game_history** — 리플레이용 턴 기록

---

## 📘 핵심 API

- `POST /rooms/create` – 방 생성
- `POST /rooms/join` – 방 입장
- `POST /:room_id/status` – 게임 상태 변경
- `GET /:room_id/load` – 게임 상태 불러오기
- `POST /:room_id/reset` – 기물 초기화
- `POST /:room_id/leave` – 방 퇴장 (/load 로직안에 DELETE 방 삭제 기능 추가)
- `GET /:room_id/replay` – 리플레이 데이터 조회
- `POST /movable` – 이동 가능한 좌표 계산
- `POST /move` – 말 이동

---

## 👩‍💻 개발 포인트 요약

- 장기 기물은 개별 row가 아닌 **JSON snapshot 구조**로 저장 → 실시간/리플레이 안정성 증가
- PlayScene에서 복잡한 로직 제거 → **services / ui** 구조로 완전 분리
- Phaser 좌표계 / 타일 매핑 재정의
- 실시간 동기화와 이동 규칙, UX 모달까지 전체 시스템 안정화

---

## 🧑‍🎨 Author

yunsuper

GitHub: https://github.com/yunsuper
