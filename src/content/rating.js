let autoGradeTimer = null;
let autoObserverStarted = false;

function findNearestRadioGroupContainer(radio, boundary) {
  let node = radio.parentElement;
  while (node && node !== boundary && node !== document.body) {
    const count = node.querySelectorAll('input[type="radio"]').length;
    if (count >= 2) {
      return node;
    }
    node = node.parentElement;
  }
  if (boundary) {
    const count = boundary.querySelectorAll('input[type="radio"]').length;
    if (count >= 2) {
      return boundary;
    }
  }
  return null;
}

function findRatingGroups(root) {
  if (!root || !root.querySelectorAll) {
    return [];
  }
  const groups = [];
  const seen = new Set();
  const addGroup = (element) => {
    if (!element || seen.has(element)) {
      return;
    }
    seen.add(element);
    groups.push(element);
  };

  if (RATING_GROUP_SELECTORS.length > 0) {
    root
      .querySelectorAll(RATING_GROUP_SELECTORS.join(","))
      .forEach(addGroup);
  }

  root.querySelectorAll("fieldset").forEach((element) => {
    const count = element.querySelectorAll('input[type="radio"]').length;
    if (count >= 2) {
      addGroup(element);
    }
  });

  const radioInputs = Array.from(root.querySelectorAll('input[type="radio"]'));
  if (radioInputs.length > 0) {
    const boundary = getRootElement(root);
    radioInputs.forEach((radio) => {
      const container = findNearestRadioGroupContainer(radio, boundary);
      if (container) {
        addGroup(container);
      }
    });
  }

  return groups;
}

function findGradingRoot() {
  let fallbackRoot = null;
  for (const selector of ROOT_SELECTORS) {
    const element = document.querySelector(selector);
    if (!element) {
      continue;
    }
    if (!fallbackRoot) {
      fallbackRoot = element;
    }
    if (findRatingGroups(element).length > 0) {
      return element;
    }
  }

  const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
  for (const dialog of dialogs) {
    if (findRatingGroups(dialog).length > 0) {
      return dialog;
    }
  }

  const tableContainers = Array.from(
    document.querySelectorAll(".MuiTableContainer-root, table")
  );
  let bestContainer = null;
  let bestCount = 0;
  for (const container of tableContainers) {
    const count = findRatingGroups(container).length;
    if (count > bestCount) {
      bestContainer = container;
      bestCount = count;
    }
  }
  if (bestContainer) {
    return bestContainer;
  }

  if (findRatingGroups(document).length > 0) {
    return document.body || document.documentElement;
  }

  if (fallbackRoot) {
    return fallbackRoot;
  }

  return null;
}

function findGradeButton(root) {
  const scope = root || document;
  const buttons = Array.from(scope.querySelectorAll("button"));
  const gradeBtn = buttons.find((btn) => {
    const text = (btn.textContent || "").trim();
    return /grade|cham|chấm/i.test(text);
  });
  if (gradeBtn) {
    return gradeBtn;
  }

  return buttons.find((btn) =>
    /grade|cham|chấm/i.test(btn.getAttribute("aria-label") || "")
  );
}

function clickRating(group, rating) {
  if (!group || group.getAttribute(AUTO_GRADE_ATTR) === "true") {
    return false;
  }

  const radios = group.querySelectorAll('input[type="radio"]');
  if (radios.length > 0) {
    const index = Math.min(rating, radios.length) - 1;
    if (index >= 0 && !radios[index].disabled) {
      radios[index].click();
      group.setAttribute(AUTO_GRADE_ATTR, "true");
      return true;
    }
    return false;
  }

  const stars = group.querySelectorAll(".MuiRating-icon, span, svg");
  if (stars.length > 0) {
    const index = Math.min(rating, stars.length) - 1;
    if (index >= 0) {
      stars[index].click();
      group.setAttribute(AUTO_GRADE_ATTR, "true");
      return true;
    }
  }

  return false;
}

function autoGrade(rating = DEFAULT_RATING, options = {}) {
  const { force = false } = options;
  const root = findGradingRoot();
  if (!root) {
    console.log("Không tìm thấy bảng chấm điểm");
    return;
  }

  const ratingGroups = findRatingGroups(root);
  if (ratingGroups.length === 0) {
    console.log("Không tìm thấy ô rating");
    return;
  }

  let gradedCount = 0;
  ratingGroups.forEach((group) => {
    if (clickRating(group, rating)) {
      gradedCount += 1;
    }
  });

  if (gradedCount === 0 && !force) {
    console.log("Không có ô rating mới để chấm");
    return;
  }

  console.log("Đã chấm sao cho các ô rating");

  const gradeBtn = findGradeButton(root) || findGradeButton(document);
  if (gradeBtn) {
    gradeBtn.click();
    console.log("Đã bấm nút Grade");
  } else {
    console.log("Không tìm được nút Grade");
  }
}

function scheduleAutoGrade(rating = DEFAULT_RATING) {
  if (autoGradeTimer) {
    clearTimeout(autoGradeTimer);
  }
  autoGradeTimer = setTimeout(() => {
    autoGrade(rating);
  }, AUTO_GRADE_DEBOUNCE_MS);
}

function startAutoDetect() {
  if (autoObserverStarted) {
    return;
  }
  autoObserverStarted = true;

  scheduleAutoGrade(DEFAULT_RATING);

  const observer = new MutationObserver((mutations) => {
    const hasAddedNodes = mutations.some(
      (mutation) => mutation.addedNodes && mutation.addedNodes.length > 0
    );
    if (hasAddedNodes) {
      scheduleAutoGrade(DEFAULT_RATING);
    }
  });

  const root = document.documentElement || document.body;
  if (root) {
    observer.observe(root, { childList: true, subtree: true });
  }
}
