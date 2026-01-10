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

  const question = extractQuestionText();
  if (!question) {
    console.log("Không tìm thấy nội dung câu hỏi");
    aiCommentInFlight = false;
    return;
  }

  const response = await requestAiGenerate(question);
  if (!response || response.status !== "ok") {
    console.log("AI generate failed:", response?.error || "Unknown error");
    aiCommentInFlight = false;
    return;
  }

  const comment = (response.text || "").trim();
  if (!comment) {
    console.log("AI trả về comment trống");
    aiCommentInFlight = false;
    return;
  }

  const hasField = await waitForCommentField(root);
  if (!hasField) {
    console.log("Không tìm thấy ô comment để điền");
    aiCommentInFlight = false;
    return;
  }

  autoComment(comment, { force: true, autoSend, root });
  aiCommentInFlight = false;
}
