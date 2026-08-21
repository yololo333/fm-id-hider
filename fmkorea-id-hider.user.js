// ==UserScript==
// @name         펨코 아이디 가리기
// @namespace    https://github.com/yololo333/fm-id-hider
// @version      1.0.0
// @description  에펨코리아(fmkorea.com)에서 작성자 닉네임/아이디를 숨기거나 블러 처리합니다. (친목 방지용)
// @author       yololo333
// @match        *://www.fmkorea.com/*
// @match        *://m.fmkorea.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/yololo333/fm-id-hider/main/fmkorea-id-hider.user.js
// @downloadURL  https://raw.githubusercontent.com/yololo333/fm-id-hider/main/fmkorea-id-hider.user.js
// ==/UserScript==

(function () {
  "use strict";

  const KEYS = {
    enabled: "fkih_enabled",
    mode: "fkih_mode",
    customSelectors: "fkih_custom_selectors",
    pickerActive: "fkih_picker_active"
  };

  const DEFAULT_SELECTORS = [
    "td.author a",
    "td.author",
    ".bd_lst .author a",
    ".bd_lst_wrt .author",
    ".top_content .side.fr a.member_plate",
    ".side.fr .member_plate",
    "a.member_plate",
    ".member_plate",
    ".comment_nick",
    ".fdb_lst_wrp .comment_nick",
    ".xe_content .comment_wrap .member_plate",
    "li.comment_element .meta a",
    ".comment_box .meta .member_plate",
    ".author_nick",
    ".writer_nick",
    "a.findParent"
  ];

  let state = {
    enabled: GM_getValue(KEYS.enabled, true),
    mode: GM_getValue(KEYS.mode, "blur"),
    customSelectors: GM_getValue(KEYS.customSelectors, []),
    pickerActive: false
  };

  GM_addStyle(`
    .fkih-hidden { visibility: hidden !important; }
    .fkih-blur {
      filter: blur(5px) !important;
      transition: filter 0.15s ease !important;
      cursor: pointer !important;
    }
    .fkih-blur:hover { filter: blur(0) !important; }

    #fkih-fab {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483000;
      width: 44px; height: 44px; border-radius: 50%; background: #ff3b30;
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 20px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      user-select: none;
    }
    #fkih-panel {
      position: fixed; right: 16px; bottom: 68px; z-index: 2147483000;
      width: 260px; background: white; border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25); padding: 14px;
      font-family: -apple-system, "Malgun Gothic", sans-serif; font-size: 13px; color: #222;
      display: none;
    }
    #fkih-panel h3 { margin: 0 0 10px; font-size: 14px; }
    #fkih-panel .row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    #fkih-panel .mode-group { display: flex; gap: 6px; margin-bottom: 10px; }
    #fkih-panel .mode-btn {
      flex: 1; padding: 6px 0; border: 1px solid #ddd; border-radius: 6px;
      background: #f6f6f6; cursor: pointer; font-size: 12px; text-align: center;
    }
    #fkih-panel .mode-btn.active { background: #ff3b30; color: white; border-color: #ff3b30; }
    #fkih-panel .picker-btn {
      width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ff3b30;
      background: white; color: #ff3b30; cursor: pointer; font-size: 12px; margin-bottom: 8px;
    }
    #fkih-panel .picker-btn.on { background: #ff3b30; color: white; }
    #fkih-panel textarea {
      width: 100%; height: 55px; box-sizing: border-box; font-size: 11px;
      resize: vertical; padding: 6px; border: 1px solid #ddd; border-radius: 6px;
    }
    #fkih-panel .hint { font-size: 10px; color: #888; line-height: 1.4; margin-top: 4px; }
    #fkih-panel .save-btn {
      width: 100%; margin-top: 8px; padding: 7px; border-radius: 6px; border: none;
      background: #333; color: white; cursor: pointer; font-size: 12px;
    }
    #fkih-hoverbox {
      position: fixed; pointer-events: none; border: 2px solid #ff3b30;
      background: rgba(255,59,48,0.15); z-index: 2147483647; display: none;
    }
    .switch { position: relative; width: 38px; height: 22px; display: inline-block; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .switch .slider {
      position: absolute; inset: 0; background-color: #ccc; border-radius: 22px;
      transition: .2s; cursor: pointer;
    }
    .switch .slider:before {
      position: absolute; content: ""; height: 16px; width: 16px;
      left: 3px; bottom: 3px; background-color: white; border-radius: 50%; transition: .2s;
    }
    .switch input:checked + .slider { background-color: #ff3b30; }
    .switch input:checked + .slider:before { transform: translateX(16px); }
  `);

  function getAllSelectors() {
    return DEFAULT_SELECTORS.concat(state.customSelectors || []);
  }

  function applyToElement(el) {
    if (!el) return;
    el.classList.remove("fkih-hidden", "fkih-blur");
    if (!state.enabled) return;
    if (state.mode === "hide") {
      el.classList.add("fkih-hidden");
    } else {
      el.classList.add("fkih-blur");
    }
  }

  function removeAll() {
    document.querySelectorAll(".fkih-hidden, .fkih-blur").forEach((el) => {
      el.classList.remove("fkih-hidden", "fkih-blur");
    });
  }

  function runPass() {
    if (!state.enabled) {
      removeAll();
      return;
    }
    getAllSelectors().forEach((sel) => {
      let nodes;
      try {
        nodes = document.querySelectorAll(sel);
      } catch (e) {
        return;
      }
      nodes.forEach(applyToElement);
    });
  }

  // ---- 요소 선택(피커) 모드 ----
  let hoverBox = null;
  function ensureHoverBox() {
    if (hoverBox) return hoverBox;
    hoverBox = document.createElement("div");
    hoverBox.id = "fkih-hoverbox";
    document.documentElement.appendChild(hoverBox);
    return hoverBox;
  }

  function buildSelectorFor(el) {
    if (el.id) return "#" + CSS.escape(el.id);
    const cls = (el.className && typeof el.className === "string")
      ? el.className.trim().split(/\s+/).filter(Boolean)
      : [];
    if (cls.length > 0) {
      return el.tagName.toLowerCase() + "." + cls.map((c) => CSS.escape(c)).join(".");
    }
    const parent = el.parentElement;
    if (!parent) return el.tagName.toLowerCase();
    const idx = Array.prototype.indexOf.call(parent.children, el) + 1;
    return el.tagName.toLowerCase() + `:nth-child(${idx})`;
  }

  function onPickerMouseMove(e) {
    if (!state.pickerActive) return;
    const box = ensureHoverBox();
    const r = e.target.getBoundingClientRect();
    box.style.display = "block";
    box.style.left = r.left + "px";
    box.style.top = r.top + "px";
    box.style.width = r.width + "px";
    box.style.height = r.height + "px";
  }

  function onPickerClick(e) {
    if (!state.pickerActive) return;
    if (e.target.closest("#fkih-panel") || e.target.closest("#fkih-fab")) return;
    e.preventDefault();
    e.stopPropagation();
    const sel = buildSelectorFor(e.target);
    if (!state.customSelectors.includes(sel)) {
      state.customSelectors.push(sel);
      GM_setValue(KEYS.customSelectors, state.customSelectors);
      if (customSelectorsEl) customSelectorsEl.value = state.customSelectors.join("\n");
    }
    setPicker(false);
    runPass();
  }

  document.addEventListener("mousemove", onPickerMouseMove, true);
  document.addEventListener("click", onPickerClick, true);

  // ---- 패널 UI ----
  let panelEl, pickerBtnEl, modeBlurBtn, modeHideBtn, enabledToggleEl, customSelectorsEl;

  function setPicker(active) {
    state.pickerActive = active;
    if (pickerBtnEl) {
      pickerBtnEl.classList.toggle("on", active);
      pickerBtnEl.textContent = active
        ? "🎯 선택 중... (페이지에서 닉네임 클릭)"
        : "🎯 놓친 아이디 직접 선택하기";
    }
    if (!active && hoverBox) hoverBox.style.display = "none";
  }

  function buildPanel() {
    const fab = document.createElement("div");
    fab.id = "fkih-fab";
    fab.textContent = "🙈";

    const panel = document.createElement("div");
    panel.id = "fkih-panel";
    panel.innerHTML = `
      <h3>펨코 아이디 가리기</h3>
      <div class="row">
        <span>사용</span>
        <label class="switch">
          <input type="checkbox" id="fkih-enabled" />
          <span class="slider"></span>
        </label>
      </div>
      <div class="mode-group">
        <div class="mode-btn" id="fkih-mode-blur">블러</div>
        <div class="mode-btn" id="fkih-mode-hide">숨기기</div>
      </div>
      <button class="picker-btn" id="fkih-picker">🎯 놓친 아이디 직접 선택하기</button>
      <div>커스텀 선택자 (한 줄에 하나씩)</div>
      <textarea id="fkih-custom" placeholder=".example_class"></textarea>
      <div class="hint">놓친 닉네임이 있으면 위 버튼으로 클릭해서 추가하거나, 여기 직접 CSS 선택자를 적고 저장하세요.</div>
      <button class="save-btn" id="fkih-save">저장</button>
    `;

    document.documentElement.appendChild(fab);
    document.documentElement.appendChild(panel);

    panelEl = panel;
    pickerBtnEl = panel.querySelector("#fkih-picker");
    modeBlurBtn = panel.querySelector("#fkih-mode-blur");
    modeHideBtn = panel.querySelector("#fkih-mode-hide");
    enabledToggleEl = panel.querySelector("#fkih-enabled");
    customSelectorsEl = panel.querySelector("#fkih-custom");

    enabledToggleEl.checked = state.enabled;
    customSelectorsEl.value = (state.customSelectors || []).join("\n");
    renderMode();

    fab.addEventListener("click", () => {
      panel.style.display = panel.style.display === "block" ? "none" : "block";
    });

    enabledToggleEl.addEventListener("change", () => {
      state.enabled = enabledToggleEl.checked;
      GM_setValue(KEYS.enabled, state.enabled);
      runPass();
    });

    modeBlurBtn.addEventListener("click", () => {
      state.mode = "blur";
      GM_setValue(KEYS.mode, "blur");
      renderMode();
      runPass();
    });

    modeHideBtn.addEventListener("click", () => {
      state.mode = "hide";
      GM_setValue(KEYS.mode, "hide");
      renderMode();
      runPass();
    });

    pickerBtnEl.addEventListener("click", () => {
      setPicker(!state.pickerActive);
      if (state.pickerActive) panel.style.display = "none";
    });

    panel.querySelector("#fkih-save").addEventListener("click", (e) => {
      const lines = customSelectorsEl.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      state.customSelectors = lines;
      GM_setValue(KEYS.customSelectors, lines);
      const btn = e.target;
      btn.textContent = "저장됨!";
      setTimeout(() => (btn.textContent = "저장"), 1000);
      runPass();
    });
  }

  function renderMode() {
    modeBlurBtn.classList.toggle("active", state.mode === "blur");
    modeHideBtn.classList.toggle("active", state.mode === "hide");
  }

  GM_registerMenuCommand("설정 패널 열기/닫기", () => {
    if (panelEl) panelEl.style.display = panelEl.style.display === "block" ? "none" : "block";
  });

  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runPass, 120);
  });

  function start() {
    buildPanel();
    observer.observe(document.documentElement, { childList: true, subtree: true });
    runPass();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
