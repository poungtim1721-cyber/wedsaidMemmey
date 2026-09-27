// 1. ดึง manga_id จาก URL หรือใช้ค่าเริ่มต้น
const urlParams = new URLSearchParams(window.location.search);
const mangaId = Number(urlParams.get("manga_id") || urlParams.get("id") || 1);

const mangaPages = [
  "1.png", "2 (2).png", "3 (2).png", "4 (2).png", "5 (2).png", "6 (2).png",
  "7 (2).png", "8 (2).png", "9 (2).png", "10.png", "11 (2).png", "12 (2).png",
  "13.png", "14.png", "15.png", "16.png", "17.png", "18.png"
];
const TRANSLATION_ENDPOINT = "https://api.mymemory.translated.net/get";
const DICTIONARY_ENDPOINT = "https://jisho.org/api/v1/search/words?keyword=";
let latestApiTranslation = "";

// Helper ดึง Supabase Client
function getSupabase() {
  return window.getSupabaseClient 
    ? window.getSupabaseClient() 
    : (window.supabaseClient || window.supabase);
}

function getFallbackTranslation(text) {
  const normalized = text.replace(/\s+/g, "").trim();
  const fallback = window.MANGA_TRANSLATION_FALLBACK || {};
  return Object.entries(fallback).find(([key]) => normalized.includes(key))?.[1] || null;
}

const track = document.getElementById("pageTrack");
const viewport = document.getElementById("pageViewport");
const pageCounter = document.getElementById("pageCounter");
const dots = document.getElementById("pageDots");
const readerStage = document.querySelector(".reader-stage");

const selectionBox = document.createElement("div");
selectionBox.className = "selection-box";
if (readerStage) readerStage.appendChild(selectionBox);

let currentPage = 0;
let dragStartX = null;
let selectionStart = null;
let selecting = false;

if (track && dots) {
  mangaPages.forEach((file, index) => {
    const page = document.createElement("article");
    page.className = "manga_vocabularies-page";
    page.setAttribute("aria-label", `หน้าที่ ${index + 1}`);
    page.innerHTML = `<img src="${encodeURI(file)}" alt="มังงะหน้าที่ ${index + 1}" loading="${index ? "lazy" : "eager"}">`;
    track.appendChild(page);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `ไปหน้าที่ ${index + 1}`);
    dot.addEventListener("click", () => goToPage(index));
    dots.appendChild(dot);
  });
}

function goToPage(page) {
  currentPage = Math.max(0, Math.min(page, mangaPages.length - 1));
  if (track) track.style.transform = `translateX(-${currentPage * 100}%)`;
  if (pageCounter) pageCounter.textContent = `หน้า ${currentPage + 1} / ${mangaPages.length}`;
  loadSavedTranslation(currentPage);
  
  if (dots) {
    [...dots.children].forEach((dot, index) => dot.classList.toggle("active", index === currentPage));
  }
  
  const prevPage = document.getElementById("previousPage");
  const nextPage = document.getElementById("nextPage");
  if (prevPage) prevPage.disabled = currentPage === 0;
  if (nextPage) nextPage.disabled = currentPage === mangaPages.length - 1;
}

// 2. ปรับการโหลดให้ดึงจาก Supabase
async function loadSavedTranslation(pageIndex) {
  const saveStatus = document.getElementById("saveStatus");
  const jpInput = document.getElementById("japaneseText");
  const transInput = document.getElementById("translationResult");
  const meaningInput = document.getElementById("meaningResult");

  const pageNo = pageIndex + 1;
  const client = getSupabase();

  if (!client) {
    if (saveStatus) saveStatus.textContent = "ไม่ได้เชื่อมต่อฐานข้อมูล";
    return;
  }

  try {
    const { data, error } = await client
      .from("manga_vocabularies")
      .select("kanji, kana, meaning")
      .eq("manga_id", mangaId)
      .eq("page_no", pageNo)
      .order("seq_no", { ascending: true })
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      const item = data[0];
      if (jpInput) jpInput.value = item.kanji || "";
      if (transInput) transInput.value = item.meaning || "";
      if (meaningInput) meaningInput.value = item.kana || "";
      if (saveStatus) saveStatus.textContent = "โหลดคำแปลจาก Supabase แล้ว";
    } else {
      if (jpInput) jpInput.value = "";
      if (transInput) transInput.value = "";
      if (meaningInput) meaningInput.value = "";
      if (saveStatus) saveStatus.textContent = "หน้านี้ยังไม่มีคำแปลที่บันทึกไว้";
    }
  } catch (error) {
    console.error("Failed to load from Supabase:", error);
    if (saveStatus) saveStatus.textContent = "ดึงข้อมูลล้มเหลว";
  }
}

function changePage(step) { goToPage(currentPage + step); }

document.getElementById("previousPage")?.addEventListener("click", () => changePage(-1));
document.getElementById("nextPage")?.addEventListener("click", () => changePage(1));
document.getElementById("nextFooter")?.addEventListener("click", () => changePage(1));
document.getElementById("lastFooter")?.addEventListener("click", () => goToPage(mangaPages.length - 1));
document.getElementById("closeReader")?.addEventListener("click", () => {
  if (history.length > 1) history.back(); else window.location.href = "index.html";
});

document.addEventListener("keydown", (event) => {
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return;
  if (event.key === "ArrowLeft") changePage(-1);
  if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); changePage(1); }
});

if (viewport) {
  viewport.addEventListener("pointerdown", (event) => {
    if (selecting) return;
    dragStartX = event.clientX;
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener("pointerup", (event) => {
    if (selecting) return;
    if (dragStartX === null) return;
    const distance = event.clientX - dragStartX;
    if (Math.abs(distance) > 45) changePage(distance < 0 ? 1 : -1);
    dragStartX = null;
  });
}

goToPage(0);

const translationPanel = document.getElementById("translationPanel");
document.getElementById("openTranslation")?.addEventListener("click", () => {
  if (!translationPanel) return;
  translationPanel.hidden = !translationPanel.hidden;
  document.getElementById("openTranslation")?.setAttribute("aria-expanded", String(!translationPanel.hidden));
  if (!translationPanel.hidden) document.getElementById("japaneseText")?.focus();
});
document.getElementById("closeTranslation")?.addEventListener("click", () => {
  if (translationPanel) translationPanel.hidden = true;
  document.getElementById("openTranslation")?.setAttribute("aria-expanded", "false");
});
document.getElementById("clearTranslation")?.addEventListener("click", () => {
  ["japaneseText", "translationResult", "meaningResult", "scanStatus", "saveStatus"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.tagName === "INPUT" || el.tagName === "TEXTAREA" ? el.value = "" : el.textContent = "";
  });
});

function currentImageRect() {
  return track.children[currentPage].querySelector("img").getBoundingClientRect();
}

function updateSelection(event) {
  const imageRect = currentImageRect();
  const stageRect = readerStage.getBoundingClientRect();
  const startX = Math.max(imageRect.left, Math.min(selectionStart.x, imageRect.right));
  const startY = Math.max(imageRect.top, Math.min(selectionStart.y, imageRect.bottom));
  const endX = Math.max(imageRect.left, Math.min(event.clientX, imageRect.right));
  const endY = Math.max(imageRect.top, Math.min(event.clientY, imageRect.bottom));
  const left = Math.min(startX, endX) - stageRect.left;
  const top = Math.min(startY, endY) - stageRect.top;
  selectionBox.style.left = `${left}px`;
  selectionBox.style.top = `${top}px`;
  selectionBox.style.width = `${Math.abs(endX - startX)}px`;
  selectionBox.style.height = `${Math.abs(endY - startY)}px`;
}

function finishSelection(event) {
  if (!selectionStart) return;
  updateSelection(event);
  const imageRect = currentImageRect();
  const left = Math.max(0, Math.min(selectionStart.x, event.clientX) - imageRect.left);
  const top = Math.max(0, Math.min(selectionStart.y, event.clientY) - imageRect.top);
  const width = Math.min(imageRect.width - left, Math.abs(event.clientX - selectionStart.x));
  const height = Math.min(imageRect.height - top, Math.abs(event.clientY - selectionStart.y));
  
  selectionStart = null;
  selecting = false;
  if (readerStage) readerStage.classList.remove("selecting");
  const scanHelp = document.getElementById("scanHelp");
  if (scanHelp) scanHelp.hidden = true;
  
  if (width < 12 || height < 12) {
    selectionBox.style.display = "none";
    const status = document.getElementById("scanStatus");
    if (status) status.textContent = "กรุณาลากกรอบให้ครอบข้อความที่ต้องการ";
    return;
  }
  scanSelectedRegion({ left, top, width, height });
}

async function scanSelectedRegion(region) {
  const scanButton = document.getElementById("scanButton");
  const scanStatus = document.getElementById("scanStatus");
  const textBox = document.getElementById("japaneseText");
  const image = track.children[currentPage].querySelector("img");
  
  if (scanButton) scanButton.disabled = true;
  if (scanStatus) scanStatus.textContent = "กำลังสแกนเฉพาะพื้นที่ที่เลือก...";
  
  try {
    const scaleX = image.naturalWidth / image.clientWidth;
    const scaleY = image.naturalHeight / image.clientHeight;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(region.width * scaleX);
    canvas.height = Math.round(region.height * scaleY);
    canvas.getContext("2d").drawImage(image, region.left * scaleX, region.top * scaleY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    
    const result = await Tesseract.recognize(canvas, "jpn", {
      logger: (message) => {
        if (message.status === "recognizing text" && scanStatus) {
          scanStatus.textContent = `กำลังสแกน ${(message.progress * 100).toFixed(0)}%`;
        }
      }
    });
    
    const scannedText = normalizeOcrText(result.data);
    if (!scannedText) throw new Error("ไม่พบข้อความในพื้นที่ที่เลือก");
    
    if (textBox) textBox.value = scannedText;
    if (scanStatus) scanStatus.textContent = "สแกนสำเร็จ กำลังค้นหาความหมายและแปล...";
    
    await Promise.allSettled([translateText(), explainMeaning(scannedText)]);
  } catch (error) {
    if (scanStatus) scanStatus.textContent = `สแกนไม่สำเร็จ: ${error.message}`;
    console.error("Selected Japanese OCR failed:", error);
  } finally {
    if (scanButton) scanButton.disabled = false;
    selectionBox.style.display = "none";
  }

  function normalizeOcrText(ocrData) {
    const symbols = (ocrData.symbols || [])
      .filter((symbol) => symbol.text && !/^\s+$/.test(symbol.text))
      .map((symbol) => ({
        text: symbol.text,
        x: symbol.bbox.x0,
        y: symbol.bbox.y0,
        width: Math.max(1, symbol.bbox.x1 - symbol.bbox.x0),
        height: Math.max(1, symbol.bbox.y1 - symbol.bbox.y0)
      }));
    if (!symbols.length) return (ocrData.text || "").replace(/\s+/g, " ").trim();

    const xValues = symbols.map((symbol) => symbol.x);
    const yValues = symbols.map((symbol) => symbol.y);
    const xRange = Math.max(...xValues) - Math.min(...xValues);
    const yRange = Math.max(...yValues) - Math.min(...yValues);
    const vertical = yRange > xRange * 1.15;
    if (!vertical) return symbols.map((symbol) => symbol.text).join("").replace(/\s+/g, " ").trim();

    const averageWidth = symbols.reduce((sum, symbol) => sum + symbol.width, 0) / symbols.length;
    const columnGap = Math.max(averageWidth * 1.8, 8);
    const columns = [];
    [...symbols].sort((a, b) => b.x - a.x).forEach((symbol) => {
      const column = columns.find((item) => Math.abs(item.x - symbol.x) <= columnGap);
      if (column) {
        column.symbols.push(symbol);
        column.x = column.symbols.reduce((sum, item) => sum + item.x, 0) / column.symbols.length;
      } else {
        columns.push({ x: symbol.x, symbols: [symbol] });
      }
    });
    return columns
      .sort((a, b) => b.x - a.x)
      .map((column) => column.symbols.sort((a, b) => a.y - b.y).map((symbol) => symbol.text).join(""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
}

document.getElementById("scanButton")?.addEventListener("click", () => {
  if (!window.Tesseract) {
    const status = document.getElementById("scanStatus");
    if (status) status.textContent = "โหลดระบบสแกนไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต";
    return;
  }
  selecting = true;
  if (readerStage) readerStage.classList.add("selecting");
  const scanHelp = document.getElementById("scanHelp");
  if (scanHelp) scanHelp.hidden = false;
  const status = document.getElementById("scanStatus");
  if (status) status.textContent = "เลือกพื้นที่บนภาพที่มีข้อความ";
});

if (viewport) {
  viewport.addEventListener("pointerdown", (event) => {
    if (!selecting) return;
    event.preventDefault();
    selectionStart = { x: event.clientX, y: event.clientY };
    selectionBox.style.display = "block";
    updateSelection(event);
    viewport.setPointerCapture(event.pointerId);
  });
}
document.addEventListener("pointermove", (event) => {
  if (selecting && selectionStart) updateSelection(event);
});
document.addEventListener("pointerup", (event) => {
  if (selecting) finishSelection(event);
});
document.addEventListener("pointercancel", () => {
  if (!selecting || !selectionStart) return;
  const status = document.getElementById("scanStatus");
  if (status) status.textContent = "ปล่อยเมาส์เพื่อยืนยันพื้นที่ที่เลือก";
});

async function translateChunk(text) {
  const response = await fetch(`${TRANSLATION_ENDPOINT}?q=${encodeURIComponent(text)}&langpair=ja|th`);
  if (!response.ok) throw new Error(`Translation API returned ${response.status}`);
  const data = await response.json();
  if (data.responseStatus && data.responseStatus !== 200) {
    throw new Error(data.responseDetails || `Translation API returned ${data.responseStatus}`);
  }
  if (!data.responseData || !data.responseData.translatedText) throw new Error("Translation API returned no result");
  return data.responseData.translatedText;
}

async function explainMeaning(text) {
  const meaning = document.getElementById("meaningResult");
  if (!meaning) return;
  meaning.value = "กำลังค้นหาความหมาย...";
  const trimmed = text.replace(/\s+/g, "").trim();

  try {
    const response = await fetch(`${DICTIONARY_ENDPOINT}${encodeURIComponent(trimmed)}`);
    if (!response.ok) throw new Error(`Dictionary returned ${response.status}`);
    const data = await response.json();
    const entry = data.data && data.data[0];
    if (!entry) {
      meaning.value = "ยังไม่พบคำนี้ในพจนานุกรม";
      return;
    }
    const senses = (entry.senses || []).slice(0, 3).map((sense) => sense.english_definitions.join(", ")).join(" | ");
    const readings = (entry.japanese || []).map((word) => word.reading).filter(Boolean).join(", ");
    meaning.value = `${entry.japanese?.[0]?.word || trimmed}${readings ? ` (${readings})` : ""}: ${senses || "พบคำศัพท์"}`;
  } catch (error) {
    meaning.value = "ค้นหาความหมายไม่สำเร็จในขณะนี้";
    console.error("Dictionary lookup failed:", error);
  }
}

async function translateText() {
  const text = document.getElementById("japaneseText")?.value.trim();
  const result = document.getElementById("translationResult");
  const button = document.getElementById("translateButton");
  
  if (!text) { 
    if (result) result.value = "กรุณาใส่ข้อความภาษาญี่ปุ่นก่อนแปล"; 
    return; 
  }
  
  if (button) { button.disabled = true; button.textContent = "กำลังแปล..."; }
  if (result) result.value = "กำลังเชื่อมต่อบริการแปลภาษา";
  
  try {
    const chunks = text.match(/[\s\S]{1,450}/g) || [];
    const translations = [];
    for (const chunk of chunks) {
      translations.push(await translateChunk(chunk));
      if (result) result.value = `กำลังแปล ${translations.length} / ${chunks.length} ส่วน`;
    }
    latestApiTranslation = translations.join(" ");
    if (result) result.value = latestApiTranslation;
    explainMeaning(text);
  } catch (error) {
    const fallback = getFallbackTranslation(text);
    if (fallback) {
      latestApiTranslation = fallback.translation;
      if (result) result.value = fallback.translation;
      const meaningInput = document.getElementById("meaningResult");
      if (meaningInput) meaningInput.value = fallback.meaning;
    } else {
      if (result) result.value = `แปลไม่สำเร็จ: ${error.message}`;
    }
    console.error("Translation failed:", error);
  } finally {
    if (button) { button.disabled = false; button.textContent = "แปลเป็นภาษาไทย"; }
  }
}

document.getElementById("translateButton")?.addEventListener("click", translateText);

// 3. ปรับการบันทึกให้ลง Supabase แทนการยิง API Local / localStorage
document.getElementById("saveTranslation")?.addEventListener("click", async () => {
  const saveStatus = document.getElementById("saveStatus");
  const japanese = document.getElementById("japaneseText")?.value.trim();
  const translation = document.getElementById("translationResult")?.value.trim();
  const meaning = document.getElementById("meaningResult")?.value.trim();

  if (!translation && !japanese) {
    if (saveStatus) saveStatus.textContent = "ยังไม่มีคำแปลให้บันทึก";
    return;
  }

  const client = getSupabase();
  if (!client) {
    if (saveStatus) saveStatus.textContent = "ไม่พบการเชื่อมต่อฐานข้อมูล";
    return;
  }

  const pageNo = currentPage + 1;

  try {
    if (saveStatus) saveStatus.textContent = "กำลังบันทึกลง Supabase...";

    // บันทึกคำศัพท์ใหม่ลงไป หรืออัปเดตถ้ามีอยู่แล้วในหน้าเดียวกัน
    const { error } = await client
      .from("manga_vocabularies")
      .upsert({
        manga_id: mangaId,
        page_no: pageNo,
        seq_no: 1, 
        category: "manga-kana",
        kanji: japanese || "",
        kana: meaning || "",
        meaning: translation || ""
      }, { onConflict: "manga_id,page_no,seq_no" });

    if (error) throw error;
    
    if (saveStatus) saveStatus.textContent = `บันทึกคำแปลหน้า ${pageNo} สำเร็จ!`;
  } catch (error) {
    if (saveStatus) saveStatus.textContent = "บันทึกไม่สำเร็จ";
    console.error("Failed to save to Supabase:", error);
  }
});

document.getElementById("restoreTranslation")?.addEventListener("click", () => {
  loadSavedTranslation(currentPage);
});