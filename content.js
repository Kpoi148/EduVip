function autoGrade(rating = 5) {
  const dialog = document.querySelector('div[role="dialog"]');
  if (!dialog) {
    console.log("Không tìm thấy dialog grading");
    return;
  }

  const tableContainer = dialog.querySelector(".MuiTableContainer-root");
  if (!tableContainer) {
    console.log("Không tìm thấy bảng chấm điểm");
    return;
  }

  const ratingGroups = tableContainer.querySelectorAll(
    ".MuiRating-root, [role=\"radiogroup\"]"
  );

  ratingGroups.forEach((group) => {
    const radios = group.querySelectorAll('input[type="radio"]');
    if (radios.length > 0) {
      const index = Math.min(rating, radios.length) - 1;
      if (index >= 0) {
        radios[index].click();
      }
      return;
    }

    const stars = group.querySelectorAll(".MuiRating-icon, span, svg");
    if (stars.length > 0) {
      const index = Math.min(rating, stars.length) - 1;
      if (index >= 0) {
        stars[index].click();
      }
    }
  });

  console.log("Đã chấm sao cho tất cả ô rating");

  const gradeBtn = Array.from(dialog.querySelectorAll("button")).find((btn) =>
    /grade/i.test(btn.textContent || "")
  );

  if (gradeBtn) {
    gradeBtn.click();
    console.log("Đã bấm nút Grade");
  } else {
    console.log("Không tìm được nút Grade");
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "AUTO_GRADE") {
    autoGrade(msg.rating || 5);
    sendResponse({ status: "ok" });
  }
  return true;
});
