/**
 * Centralized Error Handling System
 * Provides custom error classes and logging utilities
 */

// Custom Error Classes
export class AppError extends Error {
    constructor(message, code = 'APP_ERROR') {
        super(message);
        this.name = 'AppError';
        this.code = code;
    }
}

export class ApiError extends AppError {
    constructor(message, statusCode, code = 'API_ERROR') {
        super(message, code);
        this.name = 'ApiError';
        this.statusCode = statusCode;
    }
}

export class ValidationError extends AppError {
    constructor(message, field, code = 'VALIDATION_ERROR') {
        super(message, code);
        this.name = 'ValidationError';
        this.field = field;
    }
}

export class StorageError extends AppError {
    constructor(message, code = 'STORAGE_ERROR') {
        super(message, code);
        this.name = 'StorageError';
    }
}

// Log levels
export const LogLevel = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};

// Error Logger
class ErrorLogger {
    constructor() {
        this.enabled = true;
    }

    log(level, message, error = null, context = {}) {
        if (!this.enabled) return;

        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            level,
            message,
            context
        };

        if (error) {
            logData.error = {
                name: error.name,
                message: error.message,
                code: error.code,
                stack: error.stack
            };
        }

        // Console output với màu sắc
        const styles = {
            error: 'color: #e53e3e; font-weight: bold',
            warn: 'color: #dd6b20; font-weight: bold',
            info: 'color: #3182ce',
            debug: 'color: #718096'
        };

        console.log(`%c[${level.toUpperCase()}] ${message}`, styles[level] || '');
        if (error) {
            console.error(error);
        }
        if (Object.keys(context).length > 0) {
            console.log('Context:', context);
        }
    }

    error(message, error = null, context = {}) {
        this.log(LogLevel.ERROR, message, error, context);
    }

    warn(message, error = null, context = {}) {
        this.log(LogLevel.WARN, message, error, context);
    }

    info(message, context = {}) {
        this.log(LogLevel.INFO, message, null, context);
    }

    debug(message, context = {}) {
        this.log(LogLevel.DEBUG, message, null, context);
    }
}

export const logger = new ErrorLogger();

// User-friendly error messages
export const ERROR_MESSAGES = {
    // API errors
    API_KEY_MISSING: 'Vui lòng nhập Gemini API Key trong settings',
    API_KEY_INVALID: 'API Key không hợp lệ. Vui lòng kiểm tra lại',
    API_REQUEST_FAILED: 'Không thể kết nối với Gemini API',
    API_TIMEOUT: 'Request timeout. Vui lòng thử lại',
    API_QUOTA_EXCEEDED: 'Đã vượt quá giới hạn API. Vui lòng thử lại sau',
    API_UNAUTHORIZED: 'API Key không có quyền truy cập',

    // Storage errors
    STORAGE_SAVE_FAILED: 'Không thể lưu settings',
    STORAGE_LOAD_FAILED: 'Không thể tải settings',

    // Validation errors
    COMMENT_EMPTY: 'Comment không được để trống',
    RATING_INVALID: 'Rating phải từ 1 đến 5',
    INPUT_TOO_LONG: 'Nội dung quá dài',

    // Content script errors
    NO_GRADING_ROOT: 'Không tìm thấy bảng chấm điểm',
    NO_RATING_GROUPS: 'Không tìm thấy ô rating',
    NO_COMMENT_FIELDS: 'Không tìm thấy ô comment',
    NO_ACTIVE_TAB: 'Không có tab đang hoạt động',

    // AI errors
    AI_GENERATE_FAILED: 'Không thể tạo comment tự động',
    AI_RESPONSE_EMPTY: 'AI trả về nội dung trống',
    NO_QUESTION_FOUND: 'Không tìm thấy nội dung câu hỏi',

    // Generic
    UNKNOWN_ERROR: 'Đã xảy ra lỗi không xác định',
    NETWORK_ERROR: 'Lỗi kết nối mạng'
};

/**
 * Convert error to user-friendly message
 */
export function getUserFriendlyMessage(error) {
    if (!error) return ERROR_MESSAGES.UNKNOWN_ERROR;

    // Check if it's a known error code
    if (error.code && ERROR_MESSAGES[error.code]) {
        return ERROR_MESSAGES[error.code];
    }

    // Check for API errors
    if (error instanceof ApiError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
            return ERROR_MESSAGES.API_UNAUTHORIZED;
        }
        if (error.statusCode === 429) {
            return ERROR_MESSAGES.API_QUOTA_EXCEEDED;
        }
        if (error.statusCode === 408) {
            return ERROR_MESSAGES.API_TIMEOUT;
        }
        return ERROR_MESSAGES.API_REQUEST_FAILED;
    }

    // Check for validation errors
    if (error instanceof ValidationError) {
        return error.message;
    }

    // Use error message if available
    if (error.message) {
        return error.message;
    }

    return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Create error response object
 */
export function createErrorResponse(error, includeStack = false) {
    const friendlyMessage = getUserFriendlyMessage(error);

    const response = {
        status: 'error',
        error: friendlyMessage,
        code: error.code || 'UNKNOWN_ERROR'
    };

    if (error instanceof ApiError && error.statusCode) {
        response.statusCode = error.statusCode;
    }

    if (includeStack && error.stack) {
        response.stack = error.stack;
    }

    return response;
}

/**
 * Create success response object
 */
export function createSuccessResponse(data = {}) {
    return {
        status: 'ok',
        ...data
    };
}
