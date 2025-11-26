// API 요청 실패 시 호출
const handleApiError = (context, errorInfo) => {
    console.error(`[API_ERROR] ${context}`, errorInfo);
};

// try-catch문에서 catch문
const handleUnexpectedError = (context, error) => {
    console.error(`[UNEXPECTED_ERROR] ${context} 중 예외 발생`, error);
};

// 게임 규칙 등 논리적 예외 상황에 대한 경고
const handleGameLogicWarning = (context, details) => {
    console.warn(`[GAME_LOGIC] ${context}`, details);
};

const ErrorHandler = {
    handleApiError,
    handleUnexpectedError,
    handleGameLogicWarning,
};

export default ErrorHandler;
