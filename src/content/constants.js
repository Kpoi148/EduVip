const DEFAULT_RATING = 5;
const DEFAULT_COMMENT = "Nhan xet: Tot";
const AUTO_GRADE_ATTR = "data-edu-autograded";
const AUTO_COMMENT_ATTR = "data-edu-autocommented";
const AUTO_GRADE_DEBOUNCE_MS = 250;
const COMMENT_WAIT_MS = 5000;
const COMMENT_CHECK_INTERVAL_MS = 200;
const ROOT_SELECTORS = [
  "[data-edu-grading-root]",
  "#entry-lesson-tabs",
  ".entry-lesson-tabs",
  "#grade-table",
  ".grade-table",
  "#grading-table",
  ".grading-table"
];
const COMMENT_ROOT_SELECTORS = [
  ".comment-form",
  ".comment-section",
  ".comment-editor",
  "#comments-container",
  "#simple-tabpanel1"
];
const QUESTION_SELECTORS = [
  "#main-content-lesson .styled",
  "#main-content-lesson",
  ".wrap-entry-lesson-content .styled",
  ".entry-lesson-content .styled"
];
const RATING_GROUP_SELECTORS = [
  ".MuiRating-root",
  "[role=\"radiogroup\"]",
  ".rating",
  ".rating-group",
  ".star-rating",
  ".stars"
];
const COMMENT_HINTS = [
  "comment",
  "nhan xet",
  "danh gia",
  "feedback",
  "remark",
  "note",
  "ghi chu"
];
const COMMENT_FIELD_SELECTORS = [
  ".w-md-editor-text-input",
  ".comment-editor textarea",
  ".comment-editor [contenteditable=\"true\"]"
];
const SEND_COMMENT_SELECTORS = [
  ".button-send-comment",
  "[data-action=\"send-comment\"]",
  "[data-testid=\"send-comment\"]",
  "button[type=\"submit\"]"
];
const REPLY_BUTTON_SELECTORS = [
  "[data-action=\"reply\"]",
  "[data-reply]",
  ".reply",
  ".reply-button",
  ".btn-reply",
  ".comment-reply",
  ".answer-button"
];
const REPLY_TEXT_HINTS = ["tra loi", "reply", "answer", "phan hoi"];
const SEND_TEXT_HINTS = ["send", "gui", "gửi", "post", "submit"];
const MAX_QUESTION_CHARS = 4000;
const AI_MAX_OUTPUT_TOKENS = 3000;
const AI_TEMPERATURE = 0.6;
const AI_COMMENT_INSTRUCTION =
  "Tra loi day du, it nhat 2-3 cau, neu can thi dua vi du ngan.";
