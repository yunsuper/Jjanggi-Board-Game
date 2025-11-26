// 임시 유저 테이블, UUID사용하기 때문에 프론트에 저장되는 로컬UUID만 있어도됨.
CREATE TABLE players (
    player_id VARCHAR(50) PRIMARY KEY NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

// 방 생성
CREATE TABLE rooms (
    room_id VARCHAR(50) PRIMARY KEY NOT NULL,
    player1_id VARCHAR(50) NULL,
    player2_id VARCHAR(50) NULL,
    player1_nickname VARCHAR(50) NULL,
    player2_nickname VARCHAR(50) NULL,
    status ENUM('waiting', 'playing', 'finished') NOT NULL DEFAULT 'waiting',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(), 
);


// 방 현재 상태 (room당 1개), room삭제 시 자동으로 삭제되게
CREATE TABLE game_state (
    room_id VARCHAR(50) PRIMARY KEY,
    board_state TEXT NOT NULL,
    turn ENUM('player1', 'player2') DEFAULT 'player1',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);  -- 마지막 저장 시각

// 히스토리 (매 턴마다 1개씩 추가) room_id로 기록 식별
CREATE TABLE game_history (
    id INT NOT NULL AUTO_INCREMENT,
    room_id VARCHAR(50) NOT NULL, // UUID, 식별자이기 때문
    turn ENUM('player1', 'player2') NOT NULL,
    board_state TEXT NOT NULL,
    current_player ENUM('player1', 'player2') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_room_id (room_id),
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);