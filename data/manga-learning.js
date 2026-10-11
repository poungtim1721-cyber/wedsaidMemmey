(() => {
  const backdrop = document.getElementById("learningBackdrop");
  const panel = backdrop?.querySelector(".learning-panel");
  const messages = document.getElementById("learningMessages");
  const form = document.getElementById("learningForm");
  const input = document.getElementById("learningInput");
  const modeSelect = document.getElementById("learningMode");
  const keyboard = document.getElementById("learningKeyboard");
  const keyboardKeys = document.getElementById("learningKanaKeys");
  const keyboardToggle = document.getElementById("learningKeyboardToggle");
  const status = document.getElementById("learningStatus");
  const clearHistoryButton = document.getElementById("learningClearHistory");
  const pageEntries = document.getElementById("learningPageEntries");
  const pageCount = document.getElementById("learningPageCount");
  const viewport = document.getElementById("pageViewport");
  const track = document.getElementById("pageTrack");
  const stage = document.querySelector(".reader-stage");
  const selectionBox = document.createElement("div");
  selectionBox.className = "learning-selection-box";
  if (stage) stage.appendChild(selectionBox);

  if (!backdrop || !panel || !messages || !form || !input || !modeSelect || !status || !viewport || !track || !stage) return;

  function displayKana(kana) {
    if (kanaScript === "hiragana") return kana;
    if (kana === "ゔ") return "ヴ";
    return String.fromCodePoint(kana.codePointAt(0) + 0x60);
  }

  function renderKanaKeyboard() {
    if (!keyboardKeys) return;
    keyboardKeys.replaceChildren();
    const fragment = document.createDocumentFragment();
    hiraganaRows.flat().forEach((kana) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "learning-kana-key";
      button.textContent = displayKana(kana);
      button.setAttribute("aria-label", `พิมพ์ ${displayKana(kana)}`);
      button.addEventListener("pointerdown", (event) => event.preventDefault());
      button.addEventListener("click", () => insertKana(displayKana(kana)));
      fragment.appendChild(button);
    });
    keyboardKeys.appendChild(fragment);
  }

  function insertKana(value) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const maxLength = Number(input.maxLength);
    const available = maxLength >= 0 ? Math.max(0, maxLength - input.value.length + (end - start)) : value.length;
    const insertion = [...value].slice(0, available).join("");
    input.setRangeText(insertion, start, end, "end");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
    status.textContent = insertion ? "" : "ข้อความถึงจำนวนตัวอักษรสูงสุดแล้ว";
  }

  function backspaceKana() {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const deleteStart = start === end ? Math.max(0, start - 1) : start;
    input.setRangeText("", deleteStart, end, "end");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
    status.textContent = "";
  }

  function modifyLastKana(mark) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    if (start !== end || start === 0) {
      status.textContent = "วางเคอร์เซอร์หลังตัวอักษรที่ต้องการเติม ゛ หรือ ゜";
      input.focus();
      return;
    }
    const previous = input.value.slice(start - 1, start);
    const hira = previous >= "ァ" && previous <= "ヶ"
      ? String.fromCodePoint(previous.codePointAt(0) - 0x60)
      : previous;
    const modified = (mark === "dakuten" ? dakutenMap : handakutenMap).get(hira);
    if (!modified) {
      status.textContent = "ตัวอักษรก่อนหน้าไม่รองรับเครื่องหมายนี้";
      input.focus();
      return;
    }
    const output = kanaScript === "katakana" ? displayKanaForScript(modified, "katakana") : modified;
    input.setRangeText(output, start - 1, start, "end");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
    status.textContent = "";
  }

  function displayKanaForScript(kana, script) {
    if (script === "hiragana") return kana;
    if (kana === "ゔ") return "ヴ";
    return String.fromCodePoint(kana.codePointAt(0) + 0x60);
  }

  keyboardToggle?.addEventListener("click", () => {
    if (!keyboard || !keyboardToggle) return;
    keyboard.hidden = !keyboard.hidden;
    keyboardToggle.setAttribute("aria-expanded", String(!keyboard.hidden));
    keyboardToggle.textContent = keyboard.hidden ? "เปิดแป้นพิมพ์" : "ซ่อนแป้นพิมพ์";
    if (!keyboard.hidden) {
      renderKanaKeyboard();
      input.focus();
    }
  });

  keyboard?.querySelectorAll("[data-kana-script]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      kanaScript = button.dataset.kanaScript;
      keyboard.querySelectorAll("[data-kana-script]").forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-pressed", String(active));
      });
      renderKanaKeyboard();
      input.focus();
    });
  });

  keyboard?.querySelectorAll("[data-kana-action], [data-kana-value]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      if (button.dataset.kanaValue) {
        insertKana(button.dataset.kanaValue);
        return;
      }
      switch (button.dataset.kanaAction) {
        case "backspace":
          backspaceKana();
          break;
        case "clear":
          input.value = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.focus();
          status.textContent = "";
          break;
        case "space":
          insertKana(" ");
          break;
        case "dakuten":
        case "handakuten":
          modifyLastKana(button.dataset.kanaAction);
          break;
        default:
          break;
      }
    });
  });

  const cards = [];
  let selecting = false;
  let selectionStart = null;
  let activePointerId = null;
  let tesseractPromise = null;
  let vocabularyPromise = null;
  let vocabularyIndexPromise = null;
  let readerPage = null;
  let pageRequestId = 0;
  const translationCache = new Map();
  let kanaScript = "hiragana";

  const hiraganaRows = [
    ["あ", "い", "う", "え", "お"],
    ["か", "き", "く", "け", "こ"],
    ["さ", "し", "す", "せ", "そ"],
    ["た", "ち", "つ", "て", "と"],
    ["な", "に", "ぬ", "ね", "の"],
    ["は", "ひ", "ふ", "へ", "ほ"],
    ["ま", "み", "む", "め", "も"],
    ["や", "ゆ", "よ"],
    ["ら", "り", "る", "れ", "ろ"],
    ["わ", "を", "ん"],
    ["ぁ", "ぃ", "ぅ", "ぇ", "ぉ", "ゃ", "ゅ", "ょ", "っ", "ゎ"]
  ];
  const dakutenMap = new Map([
    ...[..."かきくけこ"].map((kana, index) => [kana, [..."がぎぐげご"][index]]),
    ...[..."さしすせそ"].map((kana, index) => [kana, [..."ざじずぜぞ"][index]]),
    ...[..."たちつてと"].map((kana, index) => [kana, [..."だぢづでど"][index]]),
    ...[..."はひふへほ"].map((kana, index) => [kana, [..."ばびぶべぼ"][index]]),
    ["う", "ゔ"]
  ]);
  const handakutenMap = new Map([..."はひふへほ"].map((kana, index) => [kana, [..."ぱぴぷぺぽ"][index]]));

  const grammarPatterns = [
    { pattern: /ている|でいる/, text: "～ている ใช้บอกการกระทำที่กำลังดำเนินอยู่ หรือสภาพที่ดำเนินต่อเนื่อง" },
    { pattern: /たい/, text: "～たい ใช้บอกความต้องการของผู้พูดว่า “อยาก...”" },
    { pattern: /ませんでした/, text: "～ませんでした เป็นรูปปฏิเสธอดีตแบบสุภาพ" },
    { pattern: /ました/, text: "～ました เป็นรูปอดีตแบบสุภาพ" },
    { pattern: /ません/, text: "～ません เป็นรูปปฏิเสธแบบสุภาพ" },
    { pattern: /から/, text: "から ใช้บอกจุดเริ่มต้น หรือเหตุผลว่า “จาก/เพราะว่า” ตามบริบท" },
    { pattern: /けれど|けど/, text: "けれど／けど ใช้เชื่อมข้อความในความหมายว่า “แต่/แม้ว่า”" },
    { pattern: /ので/, text: "ので ใช้เชื่อมเหตุผลอย่างสุภาพว่า “เพราะว่า”" },
    { pattern: /まで/, text: "まで ใช้บอกขอบเขตหรือจุดสิ้นสุดว่า “จนถึง”" },
    { particle: "は", text: "は ทำหน้าที่ชี้หัวข้อของประโยค อ่านว่า わ เมื่อเป็นอนุภาค" },
    { particle: "が", text: "が มักชี้ประธานหรือเน้นข้อมูลใหม่ ขึ้นกับบริบท" },
    { particle: "を", text: "を มักชี้กรรมของการกระทำ และอ่านว่า お" },
    { particle: "に", text: "に ใช้ชี้เวลา จุดหมาย หรือผู้รับได้ตามบริบท" },
    { particle: "で", text: "で ใช้ชี้สถานที่เกิดการกระทำหรือวิธีการได้ตามบริบท" }
  ];

  function openPanel() {
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
    loadPageEntries();
    document.getElementById("closeLearning")?.focus();
  }

  function closePanel() {
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
    document.getElementById("learningButton")?.focus();
  }

  document.getElementById("learningButton")?.addEventListener("click", openPanel);
  document.getElementById("closeLearning")?.addEventListener("click", closePanel);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closePanel();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && backdrop.classList.contains("open")) closePanel();
  });

  function updateHistoryControls() {
    if (clearHistoryButton) clearHistoryButton.disabled = cards.length === 0;
  }

  function restoreWelcome() {
    if (messages.querySelector(".learning-welcome")) return;
    const welcome = document.createElement("p");
    welcome.className = "learning-welcome";
    welcome.textContent = "ยังไม่มีประวัติในแชท พิมพ์ข้อความหรือเลือกคำจากข้อมูลของหน้านี้เพื่อเริ่มเรียน";
    messages.insertBefore(welcome, messages.querySelector(".learning-page-vocab"));
  }

  function removeHistoryItem(item) {
    const index = cards.indexOf(item);
    if (index === -1) return;
    item.version += 1;
    item.article.remove();
    cards.splice(index, 1);
    updateHistoryControls();
    if (cards.length === 0) restoreWelcome();
    status.textContent = "ลบรายการออกจากประวัติแชทแล้ว";
  }

  function createHistoryItem(text, sourceEntry = null) {
    const welcome = messages.querySelector(".learning-welcome");
    if (welcome) welcome.remove();
    const article = document.createElement("article");
    article.className = "learning-card";
    const heading = document.createElement("div");
    heading.className = "learning-card-heading";
    const userMessage = document.createElement("p");
    userMessage.className = "learning-user-message";
    userMessage.textContent = text;
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "learning-delete-entry";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `ลบรายการค้นหา ${text}`);
    const answer = document.createElement("div");
    answer.className = "learning-answer";
    const item = { text, answer, article, version: 0, sourceEntry };
    removeButton.addEventListener("click", () => removeHistoryItem(item));
    heading.append(userMessage, removeButton);
    article.append(heading, answer);
    messages.appendChild(article);
    cards.push(item);
    updateHistoryControls();
    return item;
  }

  clearHistoryButton?.addEventListener("click", () => {
    if (cards.length === 0) return;
    const confirmed = window.confirm("ล้างประวัติที่ค้นในแชทนี้หรือไม่? ข้อมูลคำศัพท์จาก Supabase จะไม่ถูกลบ");
    if (!confirmed) return;
    cards.forEach((item) => {
      item.version += 1;
      item.article.remove();
    });
    cards.length = 0;
    updateHistoryControls();
    restoreWelcome();
    status.textContent = "ล้างประวัติแชทแล้ว ข้อมูลใน Supabase ยังอยู่เหมือนเดิม";
  });

  function showPageEntriesState(message, count = "—") {
    if (pageCount) pageCount.textContent = count;
    if (!pageEntries) return;
    const state = document.createElement("p");
    state.className = "learning-page-state";
    state.textContent = message;
    pageEntries.replaceChildren(state);
  }

  function getSupabaseClient() {
    return window.getSupabaseClient
      ? window.getSupabaseClient()
      : (window.supabaseClient || window.supabase);
  }

  async function loadPageEntries() {
    if (!readerPage || !pageEntries) {
      showPageEntriesState("กำลังรอข้อมูลหน้ามังงะ...");
      return;
    }
    const requestId = ++pageRequestId;
    const params = new URLSearchParams(window.location.search);
    const mangaId = Number(params.get("manga_id")
      || params.get("id")
      || document.querySelector(".reader")?.dataset.mangaId
      || 1);
    if (!Number.isInteger(mangaId) || mangaId < 1) {
      showPageEntriesState("รหัสมังงะไม่ถูกต้อง ไม่สามารถโหลดคำแปลจาก Supabase ได้");
      return;
    }
    showPageEntriesState(`กำลังโหลดคำศัพท์ของหน้า ${readerPage.page}...`, `หน้า ${readerPage.page}`);

    try {
      const client = getSupabaseClient();
      if (!client) throw new Error("ยังเชื่อมต่อ Supabase ไม่ได้ กรุณาตรวจการตั้งค่าการเชื่อมต่อ");
      const { data, error } = await client
        .from("manga_vocabularies")
        .select("page_no, seq_no, kana, kanji, meaning")
        .eq("manga_id", mangaId)
        .eq("page_no", readerPage.page)
        .order("seq_no", { ascending: true });
      if (error) throw new Error(error.message || "Supabase ส่งข้อผิดพลาดกลับมา");
      if (requestId !== pageRequestId) return;
      renderPageEntries(data || []);
    } catch (error) {
      if (requestId !== pageRequestId) return;
      showPageEntriesState(`โหลดคำแปลจาก Supabase ไม่สำเร็จ: ${error.message}`, `หน้า ${readerPage.page}`);
      console.error("Failed to load current page manga vocabulary:", error);
    }
  }

  function renderPageEntries(entries) {
    if (!pageEntries) return;
    if (pageCount) pageCount.textContent = entries.length ? `${entries.length} รายการ` : `หน้า ${readerPage?.page ?? "—"}`;
    pageEntries.replaceChildren();
    if (entries.length === 0) {
      showPageEntriesState(
        `หน้านี้ (หน้า ${readerPage?.page ?? "—"}) ยังไม่มีคำศัพท์หรือคำแปลที่บันทึกไว้ใน Supabase`,
        `หน้า ${readerPage?.page ?? "—"}`
      );
      return;
    }

    entries.forEach((entry, index) => {
      const card = document.createElement("article");
      card.className = "learning-page-entry";
      const top = document.createElement("div");
      top.className = "learning-entry-top";
      const number = document.createElement("span");
      number.className = "learning-entry-number";
      number.textContent = String(entry.seq_no || index + 1);
      const japanese = document.createElement("span");
      japanese.className = "learning-entry-japanese";
      japanese.textContent = entry.kanji || entry.kana || "ไม่มีข้อความภาษาญี่ปุ่น";
      top.append(number, japanese);
      card.appendChild(top);

      if (entry.kana) {
        const kana = document.createElement("p");
        kana.className = "learning-entry-kana";
        kana.textContent = `คำอ่าน: ${entry.kana}`;
        card.appendChild(kana);
      }

      const meaning = document.createElement("p");
      meaning.className = "learning-entry-meaning";
      meaning.textContent = `ความหมาย: ${entry.meaning || "ยังไม่มีคำแปลบันทึกไว้"}`;
      card.appendChild(meaning);

      const actions = document.createElement("div");
      actions.className = "learning-entry-actions";
      const learn = document.createElement("button");
      learn.type = "button";
      learn.className = "learning-entry-learn";
      learn.textContent = "เรียนคำนี้";
      learn.addEventListener("click", () => addSupabaseLearningCard(entry));
      actions.appendChild(learn);
      card.appendChild(actions);
      pageEntries.appendChild(card);
    });
  }

  window.addEventListener("manga:pagechange", (event) => {
    readerPage = event.detail;
    if (backdrop.classList.contains("open")) loadPageEntries();
  });

  function tokenize(text) {
    if (typeof Intl.Segmenter === "function") {
      const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
      return [...segmenter.segment(text)]
        .filter((item) => item.isWordLike && /[\u3040-\u30ff\u3400-\u9fff]/.test(item.segment))
        .map((item) => item.segment);
    }
    return text.match(/[\u3040-\u30ff\u3400-\u9fff々〆ヵヶー]+/g) || [];
  }

  function difficultTokens(text) {
    return tokenize(text).filter((word) => {
      const hasKanji = /[\u3400-\u9fff]/.test(word);
      return hasKanji || [...word].length >= 3;
    });
  }

  function grammarNotes(text) {
    const segments = typeof Intl.Segmenter === "function"
      ? [...new Intl.Segmenter("ja", { granularity: "word" }).segment(text)].map((item) => item.segment)
      : tokenize(text);
    return grammarPatterns
      .filter((item) => item.pattern ? item.pattern.test(text) : segments.includes(item.particle))
      .slice(0, 5);
  }

  async function translate(text, langpair = "ja|th") {
    const cacheKey = `${langpair}:${text}`;
    if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);
    const request = (async () => {
      const url = new URL("https://api.mymemory.translated.net/get");
      url.searchParams.set("q", text);
      url.searchParams.set("langpair", langpair);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`บริการแปลภาษาตอบกลับ ${response.status}`);
      const data = await response.json();
      if (data.responseStatus && data.responseStatus !== 200) {
        throw new Error(data.responseDetails || "บริการแปลภาษาไม่สามารถแปลข้อความนี้ได้");
      }
      const translated = data.responseData?.translatedText?.trim();
      if (!translated) throw new Error("บริการแปลภาษาไม่ส่งผลลัพธ์กลับมา");
      if (langpair.endsWith("|th") && !/[\u0e00-\u0e7f]/.test(translated)) {
        throw new Error("บริการแปลไม่ได้ส่งคำแปลภาษาไทยกลับมา");
      }
      return translated;
    })();
    translationCache.set(cacheKey, request);
    try {
      return await request;
    } catch (error) {
      translationCache.delete(cacheKey);
      throw error;
    }
  }

  async function loadTesseract() {
    if (window.Tesseract?.recognize) return;
    if (!tesseractPromise) {
      tesseractPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
        script.onload = () => {
          if (window.Tesseract?.recognize) resolve();
          else reject(new Error("โหลดระบบสแกนข้อความไม่สำเร็จ"));
        };
        script.onerror = () => reject(new Error("เชื่อมต่อระบบสแกนข้อความไม่สำเร็จ"));
        document.head.appendChild(script);
      });
    }
    try {
      await tesseractPromise;
    } catch (error) {
      tesseractPromise = null;
      throw error;
    }
  }

  function loadLocalVocabulary() {
    if (window.jlptVocabulary) return Promise.resolve(window.jlptVocabulary);
    if (!vocabularyPromise) {
      vocabularyPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = new URL("data/jlpt-vocab.js", window.location.href).href;
        script.onload = () => {
          if (window.jlptVocabulary) resolve(window.jlptVocabulary);
          else reject(new Error("โหลดคลังคำศัพท์ JLPT ในเว็บไม่สำเร็จ"));
        };
        script.onerror = () => reject(new Error("เปิดคลังคำศัพท์ JLPT ในเว็บไม่สำเร็จ"));
        document.head.appendChild(script);
      }).catch((error) => {
        vocabularyPromise = null;
        throw error;
      });
    }
    return vocabularyPromise;
  }

  async function findLocalVocabulary(word) {
    if (!vocabularyIndexPromise) {
      vocabularyIndexPromise = loadLocalVocabulary().then((vocabulary) => {
        const exact = new Map();
        const stems = new Map();
        const inflections = new Map([
          ["う", "い"], ["く", "き"], ["ぐ", "ぎ"], ["す", "し"], ["つ", "ち"],
          ["ぬ", "に"], ["ぶ", "び"], ["む", "み"], ["る", "り"]
        ]);
        for (const [level, entries] of Object.entries(vocabulary)) {
          entries.forEach((entry) => {
            (entry.word || "").split(/\s*;\s*/).forEach((form) => {
              const indexedEntry = { ...entry, level };
              if (!exact.has(form)) exact.set(form, indexedEntry);
              const finalKana = form.slice(-1);
              const stemEnding = inflections.get(finalKana);
              if (stemEnding && form.length > 1) {
                const stem = `${form.slice(0, -1)}${stemEnding}`;
                if (!stems.has(stem)) stems.set(stem, indexedEntry);
              }
            });
          });
        }
        return { exact, stems };
      }).catch((error) => {
        vocabularyIndexPromise = null;
        throw error;
      });
    }
    const index = await vocabularyIndexPromise;
    return index.exact.get(word) || index.stems.get(word) || null;
  }

  async function getOfflineSentenceHelp(text) {
    const vocabulary = await loadLocalVocabulary();
    const seen = new Set();
    const found = [];
    for (const word of tokenize(text)) {
      if (seen.has(word)) continue;
      seen.add(word);
      const entry = await findLocalVocabulary(word);
      if (entry) {
        found.push({
          word,
          dictionaryWord: entry.word,
          reading: entry.reading,
          meaning: entry.meaningTh || entry.meaning,
          level: entry.level
        });
      }
    }
    return found;
  }

  function appendJLPTSentenceHelp(container, words) {
    const section = document.createElement("section");
    section.className = "learning-jlpt-matches";
    const note = document.createElement("p");
    note.className = "learning-label";
    note.textContent = "คำศัพท์จากคลัง JLPT ในเว็บ";
    section.appendChild(note);
    if (words.length) {
      const list = document.createElement("div");
      list.className = "learning-offline-list";
      words.forEach((item) => {
        const word = document.createElement("p");
        word.textContent = `${item.word}${item.reading ? ` (${item.reading})` : ""}: ${item.meaning}${item.level ? ` · ${item.level}` : ""}`;
        list.appendChild(word);
      });
      section.appendChild(list);
    } else {
      const noMatches = document.createElement("p");
      noMatches.textContent = "ไม่พบคำตรงกับคลัง JLPT ในประโยคนี้";
      section.appendChild(noMatches);
    }
    container.appendChild(section);
  }

  async function appendOfflineSentenceHelp(container, text) {
    const note = document.createElement("p");
    note.textContent = "แปลทั้งประโยคแบบออฟไลน์ไม่ได้ แต่แสดงคำที่พบในคลัง JLPT ให้ตรวจดูได้";
    container.appendChild(note);
    appendJLPTSentenceHelp(container, await getOfflineSentenceHelp(text));
  }

  function createWordButton(word, container, card) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "learning-word";
    button.textContent = word;
    button.setAttribute("aria-label", `ดูคำอ่านและความหมายของ ${word}`);
    button.addEventListener("click", () => lookupWord(word, card));
    container.appendChild(button);
  }

  async function lookupWord(word, card) {
    const detail = card.querySelector(".learning-detail");
    detail.replaceChildren();
    const loading = document.createElement("p");
    loading.textContent = `กำลังค้นหา ${word} จากพจนานุกรมออนไลน์และคลัง JLPT ในเว็บ...`;
    detail.appendChild(loading);

    let localEntry = null;
    try {
      localEntry = await findLocalVocabulary(word);
      if (localEntry) renderLocalWord(localEntry, word, detail);
    } catch (error) {
      console.error("Local JLPT dictionary lookup failed:", error);
    }

    try {
      const response = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`);
      if (!response.ok) throw new Error(`พจนานุกรมตอบกลับ ${response.status}`);
      const data = await response.json();
      const entry = data.data?.[0];
      if (!entry) throw new Error("ยังไม่พบคำนี้ในพจนานุกรม");
      const japanese = entry.japanese?.find((item) => item.word === word) || entry.japanese?.[0];
      const reading = japanese?.reading || "ไม่พบคำอ่าน";
      const meanings = (entry.senses || [])
        .slice(0, 2)
        .map((sense) => (sense.english_definitions || []).join(", "))
        .filter(Boolean);
      if (!meanings.length && localEntry) {
        renderLocalWord(localEntry, word, detail);
        return;
      }
      if (!meanings.length) throw new Error("ยังไม่พบความหมายของคำนี้");
      detail.replaceChildren();
      const heading = document.createElement("p");
      heading.textContent = `${word} ・ ${reading}`;
      detail.appendChild(heading);
      const readingText = document.createElement("p");
      readingText.textContent = `คำอ่านฟุริงานะ: ${reading}`;
      detail.appendChild(readingText);
      const definition = document.createElement("p");
      try {
        const thaiMeanings = await translate(meanings.join(" / "), "en|th");
        definition.textContent = `ความหมาย: ${thaiMeanings} (${meanings.join(" / ")})`;
      } catch (error) {
        definition.textContent = localEntry?.meaningTh
          ? `ความหมาย: ${localEntry.meaningTh} (ข้อมูลสำรอง JLPT)`
          : `ความหมายภาษาอังกฤษ: ${meanings.join(" / ")} — แปลเป็นไทยไม่สำเร็จ: ${error.message}`;
        console.error("Dictionary definition translation failed:", error);
      }
      detail.appendChild(definition);
      const notes = grammarNotes(word);
      notes.forEach((note) => {
        const grammar = document.createElement("p");
        grammar.textContent = `ไวยากรณ์: ${note.text}`;
        detail.appendChild(grammar);
      });
    } catch (error) {
      if (localEntry) {
        const sourceNote = document.createElement("p");
        sourceNote.textContent = "แสดงข้อมูลสำรองจากคลังคำศัพท์ JLPT ในเว็บ (ค้นออนไลน์ไม่สำเร็จ)";
        detail.appendChild(sourceNote);
      } else {
        detail.replaceChildren();
        const errorMessage = document.createElement("p");
        errorMessage.textContent = `ยังไม่พบข้อมูลคำว่า ${word} ทั้งในพจนานุกรมออนไลน์และคลัง JLPT ลองส่งทั้งประโยค หรือตรวจคำที่สแกนจากภาพอีกครั้ง`;
        detail.appendChild(errorMessage);
        const notes = grammarNotes(word);
        notes.forEach((note) => {
          const grammar = document.createElement("p");
          grammar.textContent = `ไวยากรณ์ที่อาจเกี่ยวข้อง: ${note.text}`;
          detail.appendChild(grammar);
        });
      }
      console.error("Japanese dictionary lookup failed:", error);
    }
  }

  function renderLocalWord(entry, word, detail) {
    detail.replaceChildren();
    const heading = document.createElement("p");
    heading.textContent = `${word}${entry.reading ? ` ・ ${entry.reading}` : ""}`;
    detail.appendChild(heading);
    if (entry.reading) {
      const readingText = document.createElement("p");
      readingText.textContent = `คำอ่านฟุริงานะ: ${entry.reading}`;
      detail.appendChild(readingText);
    }
    const definition = document.createElement("p");
    definition.textContent = `ความหมาย: ${entry.meaningTh || entry.meaning || "ยังไม่มีคำแปลภาษาไทยในคลัง"}`;
    detail.appendChild(definition);
    const level = document.createElement("p");
    level.textContent = `พบในคลังคำศัพท์ JLPT ${entry.level || "ระดับที่มีในเว็บ"}`;
    detail.appendChild(level);
  }

  function renderWords(card, text, mode) {
    const list = document.createElement("div");
    list.className = "learning-word-list";
    const allWords = tokenize(text);
    const words = mode === "difficult" ? difficultTokens(text) : allWords;
    if (mode === "difficult") {
      const note = document.createElement("p");
      note.textContent = "คัดคำยากเบื้องต้นจากคำที่มีคันจิหรือมีความยาวตั้งแต่ 3 ตัวอักษร แตะคำเพื่อดูคำอ่านและความหมาย";
      card.appendChild(note);
    } else {
      const note = document.createElement("p");
      note.textContent = "แตะคำเพื่อดูคำอ่านและความหมาย";
      card.appendChild(note);
    }
    if (words.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "ไม่พบคำศัพท์ที่เข้าเกณฑ์ในข้อความนี้";
      card.appendChild(empty);
    } else {
      words.forEach((word) => createWordButton(word, list, card));
      card.appendChild(list);
    }
    const detail = document.createElement("div");
    detail.className = "learning-detail";
    detail.setAttribute("aria-live", "polite");
    card.appendChild(detail);
  }

  function addSupabaseLearningCard(entry) {
    const text = (entry.kanji || entry.kana || "").trim();
    if (!text) {
      status.textContent = "รายการนี้ไม่มีข้อความภาษาญี่ปุ่นให้นำมาฝึก";
      return;
    }
    const item = createHistoryItem(text, entry);
    renderCard(item);
    messages.scrollTop = messages.scrollHeight;
  }

  function renderSupabaseCard(item, mode) {
    item.answer.replaceChildren();
    const source = document.createElement("p");
    source.className = "learning-label";
    source.textContent = "ข้อมูลจาก Supabase";
    item.answer.appendChild(source);

    const reading = document.createElement("p");
    reading.textContent = `คำอ่าน: ${item.sourceEntry.kana || "ไม่มีข้อมูลคำอ่าน"}`;
    item.answer.appendChild(reading);

    if (mode === "hidden") {
      const hidden = document.createElement("p");
      hidden.textContent = "ซ่อนคำแปลไว้แล้ว ลองแปลข้อความนี้ด้วยตัวเองก่อน";
      item.answer.appendChild(hidden);
      const reveal = document.createElement("button");
      reveal.type = "button";
      reveal.className = "learning-reveal";
      reveal.textContent = "แสดงคำแปลจาก Supabase";
      reveal.addEventListener("click", () => {
        hidden.textContent = `ความหมาย: ${item.sourceEntry.meaning || "ยังไม่มีคำแปลบันทึกไว้"}`;
        reveal.remove();
      });
      item.answer.appendChild(reveal);
    } else {
      const meaning = document.createElement("p");
      meaning.textContent = `ความหมาย: ${item.sourceEntry.meaning || "ยังไม่มีคำแปลบันทึกไว้"}`;
      item.answer.appendChild(meaning);
    }

    renderWords(item.answer, item.text, mode);
    const notes = grammarNotes(item.text);
    if (notes.length) {
      const heading = document.createElement("p");
      heading.className = "learning-label";
      heading.textContent = "ไวยากรณ์ที่พบ";
      item.answer.appendChild(heading);
      notes.forEach((note) => {
        const grammar = document.createElement("p");
        grammar.textContent = note.text;
        item.answer.appendChild(grammar);
      });
    }
  }

  async function renderCard(item) {
    const version = ++item.version;
    item.answer.replaceChildren();
    const mode = modeSelect.value;

    if (item.sourceEntry) {
      renderSupabaseCard(item, mode);
      return;
    }

    const translationLabel = document.createElement("p");
    translationLabel.className = "learning-label";
    translationLabel.textContent = "คำแปลภาษาไทย";
    item.answer.appendChild(translationLabel);

    if (mode === "full") {
      const translated = document.createElement("p");
      translated.textContent = "กำลังแปลข้อความ...";
      item.answer.appendChild(translated);
      try {
        const result = await translate(item.text);
        if (item.version !== version) return;
        translated.textContent = result;
      } catch (error) {
        if (item.version !== version) return;
        translated.textContent = `เชื่อมต่อบริการแปลภาษาไม่สำเร็จ: ${error.message}`;
        try {
          await appendOfflineSentenceHelp(item.answer, item.text);
        } catch (fallbackError) {
          if (item.version !== version) return;
          const fallbackMessage = document.createElement("p");
          fallbackMessage.textContent = `โหลดคลังคำศัพท์สำรองไม่สำเร็จ: ${fallbackError.message}`;
          item.answer.appendChild(fallbackMessage);
          console.error("Offline sentence helper failed:", fallbackError);
        }
        console.error("Manga sentence translation failed:", error);
      }
      if (item.version !== version) return;
      if (translated.textContent && !translated.textContent.startsWith("เชื่อมต่อบริการแปลภาษาไม่สำเร็จ:")) {
        try {
          appendJLPTSentenceHelp(item.answer, await getOfflineSentenceHelp(item.text));
        } catch (error) {
          const fallbackMessage = document.createElement("p");
          fallbackMessage.textContent = `โหลดคลังคำศัพท์ JLPT ไม่สำเร็จ: ${error.message}`;
          item.answer.appendChild(fallbackMessage);
          console.error("JLPT sentence vocabulary lookup failed:", error);
        }
      }
      if (item.version !== version) return;
      renderWords(item.answer, item.text, mode);
    } else if (mode === "hidden") {
      const hidden = document.createElement("p");
      hidden.textContent = "ซ่อนคำแปลไว้แล้ว ลองอ่านประโยคด้วยตัวเองก่อน";
      item.answer.appendChild(hidden);
      const jlptReveal = document.createElement("button");
      jlptReveal.type = "button";
      jlptReveal.className = "learning-reveal";
      jlptReveal.textContent = "ดูคำศัพท์จาก JLPT";
      jlptReveal.addEventListener("click", async () => {
        jlptReveal.disabled = true;
        jlptReveal.textContent = "กำลังค้นคลัง JLPT...";
        try {
          appendJLPTSentenceHelp(item.answer, await getOfflineSentenceHelp(item.text));
          jlptReveal.remove();
        } catch (error) {
          jlptReveal.disabled = false;
          jlptReveal.textContent = "ลองค้นคลัง JLPT อีกครั้ง";
          status.textContent = `โหลดคลังคำศัพท์ JLPT ไม่สำเร็จ: ${error.message}`;
          console.error("JLPT sentence vocabulary lookup failed:", error);
        }
      });
      item.answer.appendChild(jlptReveal);
      const reveal = document.createElement("button");
      reveal.type = "button";
      reveal.className = "learning-reveal";
      reveal.textContent = "แสดงคำแปล";
      reveal.addEventListener("click", async () => {
        reveal.disabled = true;
        reveal.textContent = "กำลังแปล...";
        try {
          hidden.textContent = await translate(item.text);
          reveal.remove();
        } catch (error) {
          hidden.textContent = `บริการแปลออนไลน์ไม่พร้อม: ${error.message}`;
          reveal.textContent = "ดูคำศัพท์สำรอง";
          reveal.disabled = false;
          reveal.onclick = async () => {
            reveal.disabled = true;
            reveal.textContent = "กำลังค้นคลังคำศัพท์...";
            try {
              const words = await getOfflineSentenceHelp(item.text);
              const fallback = document.createElement("div");
              fallback.className = "learning-offline-list";
              if (words.length) {
                words.forEach((entry) => {
                  const word = document.createElement("p");
                  word.textContent = `${entry.word}${entry.reading ? ` (${entry.reading})` : ""}: ${entry.meaning}`;
                  fallback.appendChild(word);
                });
              } else {
                const noMatches = document.createElement("p");
                noMatches.textContent = "ไม่พบคำตรงกันในคลัง JLPT ลองตรวจข้อความหรือแตะคำศัพท์ด้านล่าง";
                fallback.appendChild(noMatches);
              }
              hidden.after(fallback);
              reveal.remove();
            } catch (fallbackError) {
              reveal.disabled = false;
              reveal.textContent = "ลองเปิดคลังสำรองอีกครั้ง";
              hidden.textContent = `โหลดคลังคำศัพท์สำรองไม่สำเร็จ: ${fallbackError.message}`;
              console.error("Offline sentence helper failed:", fallbackError);
            }
          };
          console.error("Manga sentence translation failed:", error);
        }
      });
      item.answer.appendChild(reveal);
      renderWords(item.answer, item.text, mode);
    } else {
      const explanation = document.createElement("p");
      explanation.textContent = "แสดงเฉพาะคำที่คัดว่าอาจยาก เพื่อให้ลองทำความเข้าใจประโยคเอง";
      item.answer.appendChild(explanation);
      try {
        appendJLPTSentenceHelp(item.answer, await getOfflineSentenceHelp(item.text));
      } catch (error) {
        const fallbackMessage = document.createElement("p");
        fallbackMessage.textContent = `โหลดคลังคำศัพท์ JLPT ไม่สำเร็จ: ${error.message}`;
        item.answer.appendChild(fallbackMessage);
        console.error("JLPT sentence vocabulary lookup failed:", error);
      }
      if (item.version !== version) return;
      renderWords(item.answer, item.text, mode);
    }

    if (item.version !== version) return;
    const notes = grammarNotes(item.text);
    if (notes.length) {
      const heading = document.createElement("p");
      heading.className = "learning-label";
      heading.textContent = "ไวยากรณ์ที่พบ";
      item.answer.appendChild(heading);
      notes.forEach((note) => {
        const grammar = document.createElement("p");
        grammar.textContent = note.text;
        item.answer.appendChild(grammar);
      });
    } else {
      const noGrammar = document.createElement("p");
      noGrammar.textContent = "ยังไม่พบรูปแบบไวยากรณ์พื้นฐานที่ระบบรู้จักในข้อความนี้";
      item.answer.appendChild(noGrammar);
    }
    const disclaimer = document.createElement("p");
    disclaimer.textContent = "คำอธิบายไวยากรณ์เป็นแนวทางเบื้องต้น ควรพิจารณาความหมายตามบริบท";
    item.answer.appendChild(disclaimer);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      status.textContent = "กรุณาใส่คำหรือประโยคภาษาญี่ปุ่น";
      return;
    }
    const item = createHistoryItem(text);
    input.value = "";
    status.textContent = "กำลังวิเคราะห์ข้อความ...";
    renderCard(item).finally(() => {
      if (cards[cards.length - 1] === item) status.textContent = "";
      messages.scrollTop = messages.scrollHeight;
    });
    input.focus();
  });

  modeSelect.addEventListener("change", () => {
    cards.forEach((item) => {
      renderCard(item).finally(() => {
        messages.scrollTop = messages.scrollHeight;
      });
    });
  });

  function currentImage() {
    const currentPage = Number(document.getElementById("pageCounter")?.textContent.match(/\d+/)?.[0] || 1);
    return track.children[currentPage - 1]?.querySelector("img") || track.querySelector("img");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function updateSelection(event) {
    if (!selectionStart) return;
    const imageRect = currentImage()?.getBoundingClientRect();
    if (!imageRect) return;
    const stageRect = stage.getBoundingClientRect();
    const x1 = clamp(selectionStart.x, imageRect.left, imageRect.right);
    const y1 = clamp(selectionStart.y, imageRect.top, imageRect.bottom);
    const x2 = clamp(event.clientX, imageRect.left, imageRect.right);
    const y2 = clamp(event.clientY, imageRect.top, imageRect.bottom);
    selectionBox.style.left = `${Math.min(x1, x2) - stageRect.left}px`;
    selectionBox.style.top = `${Math.min(y1, y2) - stageRect.top}px`;
    selectionBox.style.width = `${Math.abs(x2 - x1)}px`;
    selectionBox.style.height = `${Math.abs(y2 - y1)}px`;
    selectionBox.style.display = "block";
  }

  document.getElementById("learningScan")?.addEventListener("click", async () => {
    try {
      status.textContent = "กำลังโหลดระบบสแกนข้อความ...";
      await loadTesseract();
    } catch (error) {
      status.textContent = `${error.message} ลองพิมพ์ข้อความเองได้`;
      console.error("Japanese manga OCR loader failed:", error);
      return;
    }
    selecting = true;
    selectionStart = null;
    stage.classList.add("learning-selecting");
    selectionBox.style.display = "none";
    closePanel();
    status.textContent = "ลากกรอบครอบข้อความบนหน้ามังงะ";
  });

  viewport.addEventListener("pointerdown", (event) => {
    if (!selecting) return;
    const imageRect = currentImage()?.getBoundingClientRect();
    if (!imageRect || event.clientX < imageRect.left || event.clientX > imageRect.right || event.clientY < imageRect.top || event.clientY > imageRect.bottom) return;
    event.preventDefault();
    selectionStart = { x: event.clientX, y: event.clientY };
    activePointerId = event.pointerId;
    viewport.setPointerCapture(event.pointerId);
    updateSelection(event);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!selecting || !selectionStart) return;
    updateSelection(event);
  });

  viewport.addEventListener("pointerup", async (event) => {
    if (!selecting || !selectionStart || event.pointerId !== activePointerId) return;
    updateSelection(event);
    selecting = false;
    stage.classList.remove("learning-selecting");
    activePointerId = null;
    const start = selectionStart;
    selectionStart = null;
    const image = currentImage();
    const rect = image?.getBoundingClientRect();
    const width = rect ? Math.abs(clamp(event.clientX, rect.left, rect.right) - clamp(start.x, rect.left, rect.right)) : 0;
    const height = rect ? Math.abs(clamp(event.clientY, rect.top, rect.bottom) - clamp(start.y, rect.top, rect.bottom)) : 0;
    if (!image || width < 8 || height < 8) {
      selectionBox.style.display = "none";
      openPanel();
      status.textContent = "กรอบเลือกเล็กเกินไป ลองเลือกบริเวณข้อความให้ใหญ่ขึ้น";
      return;
    }

    status.textContent = "กำลังสแกนข้อความภาษาญี่ปุ่น...";
    openPanel();
    try {
      const left = Math.min(clamp(start.x, rect.left, rect.right), clamp(event.clientX, rect.left, rect.right)) - rect.left;
      const top = Math.min(clamp(start.y, rect.top, rect.bottom), clamp(event.clientY, rect.top, rect.bottom)) - rect.top;
      const scaleX = image.naturalWidth / rect.width;
      const scaleY = image.naturalHeight / rect.height;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scaleX));
      canvas.height = Math.max(1, Math.round(height * scaleY));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("สร้างพื้นที่สแกนข้อความไม่สำเร็จ");
      context.drawImage(
        image,
        Math.round(left * scaleX),
        Math.round(top * scaleY),
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const result = await window.Tesseract.recognize(canvas, "jpn");
      const text = result.data?.text?.replace(/\s+/g, " ").trim();
      if (!text) throw new Error("ไม่พบข้อความในบริเวณที่เลือก");
      input.value = text;
      status.textContent = "สแกนแล้ว ตรวจข้อความก่อนส่งได้เลย";
      input.focus();
    } catch (error) {
      status.textContent = `สแกนไม่สำเร็จ: ${error.message}`;
      console.error("Japanese manga OCR failed:", error);
    } finally {
      selectionBox.style.display = "none";
    }
  });

  viewport.addEventListener("pointercancel", () => {
    selecting = false;
    selectionStart = null;
    activePointerId = null;
    stage.classList.remove("learning-selecting");
    selectionBox.style.display = "none";
    openPanel();
    status.textContent = "ยกเลิกการเลือกข้อความ";
  });
})();
