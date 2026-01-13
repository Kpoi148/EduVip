let aiCommentInFlight = false;

function extractQuestionText() {
  for (const selector of QUESTION_SELECTORS) {
    const element = document.querySelector(selector);
    if (!element) {
      continue;
    }
    const text = normalizeWhitespace(element.innerText || element.textContent);
    if (text) {
      return text.slice(0, MAX_QUESTION_CHARS);
    }
  }
  return "";
}

function requestAiGenerate(input) {
  const promptInput = input
    ? `${input}\n\nYeu cau: ${AI_COMMENT_INSTRUCTION}`
    : input;
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        action: "AI_GENERATE",
        input: promptInput,
        mode: "fast",
        maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
        temperature: AI_TEMPERATURE
      },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            status: "error",
            error: chrome.runtime.lastError.message
          });
          return;
        }
        resolve(response || { status: "error", error: "No response" });
      }
    );
  });
}

async function autoCommentFromQuestion(options = {}) {
  const { autoSend = false, root } = options;
  if (aiCommentInFlight) {
    return;
  }
  aiCommentInFlight = true;

  try {
    const question = extractQuestionText();
    if (!question) {
      if (window.EduVipToast) {
        window.EduVipToast.show("Không tìm thấy nội dung câu hỏi", "warning");
      } else {
        console.warn("Không tìm thấy nội dung câu hỏi");
      }
      return;
    }

    const response = await requestAiGenerate(question);
    if (!response || response.status !== "ok") {
      const errorMsg = response?.error || "Unknown error";
      console.log("AI generate failed:", errorMsg);
      if (window.EduVipToast) {
        window.EduVipToast.show(`Lỗi AI: ${errorMsg}`, "error");
      } else {
        console.error(`Lỗi AI: ${errorMsg}`);
      }
      return;
    }

    const comment = (response.text || "").trim();
    if (!comment) {
      if (window.EduVipToast) {
        window.EduVipToast.show("AI trả về comment trống", "warning");
      } else {
        console.warn("AI trả về comment trống");
      }
      return;
    }

    const hasField = await waitForCommentField(root);
    if (!hasField) {
      if (window.EduVipToast) {
        window.EduVipToast.show("Không tìm thấy ô comment để điền", "warning");
      } else {
        console.warn("Không tìm thấy ô comment để điền");
      }
      return;
    }

    autoComment(comment, { force: true, autoSend, root });
  } finally {
    aiCommentInFlight = false;
  }
}

// Cleanup function
function resetAiState() {
  aiCommentInFlight = false;
}
