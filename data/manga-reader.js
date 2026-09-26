const mangaPages = [
  "1.png", "2 (2).png", "3 (2).png", "4 (2).png", "5 (2).png", "6 (2).png",
  "7 (2).png", "8 (2).png", "9 (2).png", "10.png", "11 (2).png", "12 (2).png",
  "13.png", "14.png", "15.png", "16.png", "17.png", "18.png"
];
const TRANSLATION_ENDPOINT = "https://api.mymemory.translated.net/get";
const DICTIONARY_ENDPOINT = "https://jisho.org/api/v1/search/words?keyword=";
const TRANSLATION_API = "/api/translations";
let latestApiTranslation = "";

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
readerStage.appendChild(selectionBox);
let currentPage = 0;
let dragStartX = null;
let selectionStart = null;
let selecting = false;

mangaPages.forEach((file, index) => {
  const page = document.createElement("article");
  page.className = "manga-page";
  page.setAttribute("aria-label", `หน้าที่ ${index + 1}`);
  page.innerHTML = `<img src="${encodeURI(file)}" alt="มังงะหน้าที่ ${index + 1}" loading="${index ? "lazy" : "eager"}">`;
  track.appendChild(page);

  const dot = document.createElement("button");
  dot.type = "button";
  dot.setAttribute("aria-label", `ไปหน้าที่ ${index + 1}`);
  dot.addEventListener("click", () => goToPage(index));
  dots.appendChild(dot);
});

function goToPage(page) {
  currentPage = Math.max(0, Math.min(page, mangaPages.length - 1));
  track.style.transform = `translateX(-${currentPage * 100}%)`;
  pageCounter.textContent = `หน้า ${currentPage + 1} / ${mangaPages.length}`;
  loadSavedTranslation(currentPage);
  [...dots.children].forEach((dot, index) => dot.classList.toggle("active", index === currentPage));
  document.getElementById("previousPage").disabled = currentPage === 0;
  document.getElementById("nextPage").disabled = currentPage === mangaPages.length - 1;
}
async function loadSavedTranslation(page) {
  const saveStatus = document.getElementById("saveStatus");
  if (location.protocol === "file:") {
    const localTranslation = localStorage.getItem(`manga-translation-page-${page}`);
    document.getElementById("translationResult").value = localTranslation || "";
    saveStatus.textContent = localTranslation ? "โหลดคำแปลจากเครื่องแล้ว" : "";
    return;
  }
  try {
    const response = await fetch(`${TRANSLATION_API}/${page}`);
    if (!response.ok) throw new Error(`Translation API returned ${response.status}`);
    const saved = await response.json();
    document.getElementById("japaneseText").value = saved.japanese || "";
    document.getElementById("translationResult").value = saved.translation || "";
    document.getElementById("meaningResult").value = saved.meaning || "";
    saveStatus.textContent = saved.updatedAt ? "โหลดข้อมูลจาก API แล้ว" : "";
  } catch (error) {
    const localTranslation = localStorage.getItem(`manga-translation-page-${page}`);
    document.getElementById("translationResult").value = localTranslation || "";
    saveStatus.textContent = location.protocol === "file:"
      ? "เปิดจากไฟล์โดยตรง: เริ่มเซิร์ฟเวอร์เพื่อบันทึกถาวร"
      : "โหลดข้อมูลจาก API ไม่สำเร็จ";
    console.error("Failed to load saved translation:", error);
  }
}
function changePage(step) { goToPage(currentPage + step); }

document.getElementById("previousPage").addEventListener("click", () => changePage(-1));
document.getElementById("nextPage").addEventListener("click", () => changePage(1));
document.getElementById("nextFooter").addEventListener("click", () => changePage(1));
document.getElementById("lastFooter").addEventListener("click", () => goToPage(mangaPages.length - 1));
document.getElementById("closeReader").addEventListener("click", () => {
  if (history.length > 1) history.back(); else window.location.href = "index.html";
});
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") changePage(-1);
  if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); changePage(1); }
});
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
goToPage(0);

const translationPanel = document.getElementById("translationPanel");
document.getElementById("openTranslation").addEventListener("click", () => {
  translationPanel.hidden = !translationPanel.hidden;
  document.getElementById("openTranslation").setAttribute("aria-expanded", String(!translationPanel.hidden));
  if (!translationPanel.hidden) document.getElementById("japaneseText").focus();
});
document.getElementById("closeTranslation").addEventListener("click", () => {
  translationPanel.hidden = true;
  document.getElementById("openTranslation").setAttribute("aria-expanded", "false");
});
document.getElementById("clearTranslation").addEventListener("click", () => {
  document.getElementById("japaneseText").value = "";
  document.getElementById("translationResult").value = "";
  document.getElementById("meaningResult").value = "";
  document.getElementById("scanStatus").textContent = "";
  document.getElementById("saveStatus").textContent = "";
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
  readerStage.classList.remove("selecting");
  document.getElementById("scanHelp").hidden = true;
  if (width < 12 || height < 12) {
    selectionBox.style.display = "none";
    document.getElementById("scanStatus").textContent = "กรุณาลากกรอบให้ครอบข้อความที่ต้องการ";
    return;
  }
  scanSelectedRegion({ left, top, width, height });
}

async function scanSelectedRegion(region) {
  const scanButton = document.getElementById("scanButton");
  const scanStatus = document.getElementById("scanStatus");
  const textBox = document.getElementById("japaneseText");
  const image = track.children[currentPage].querySelector("img");
  scanButton.disabled = true;
  scanStatus.textContent = "กำลังสแกนเฉพาะพื้นที่ที่เลือก...";
  try {
    const scaleX = image.naturalWidth / image.clientWidth;
    const scaleY = image.naturalHeight / image.clientHeight;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(region.width * scaleX);
    canvas.height = Math.round(region.height * scaleY);
    canvas.getContext("2d").drawImage(image, region.left * scaleX, region.top * scaleY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    const result = await Tesseract.recognize(canvas, "jpn", {
      logger: (message) => {
        if (message.status === "recognizing text") scanStatus.textContent = `กำลังสแกน ${(message.progress * 100).toFixed(0)}%`;
      }
    });
    const scannedText = normalizeOcrText(result.data);
    if (!scannedText) throw new Error("OCR returned no text in selected region");
    textBox.value = scannedText;
    scanStatus.textContent = "สแกนสำเร็จ กำลังค้นหาความหมายและแปล...";
    await Promise.allSettled([translateText(), explainMeaning(scannedText)]);
  } catch (error) {
    scanStatus.textContent = `สแกนไม่สำเร็จ: ${error.message}`;
    console.error("Selected Japanese OCR failed:", error);
  } finally {
    scanButton.disabled = false;
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

document.getElementById("scanButton").addEventListener("click", () => {
  if (!window.Tesseract) {
    document.getElementById("scanStatus").textContent = "โหลดระบบสแกนไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต";
    return;
  }
  selecting = true;
  readerStage.classList.add("selecting");
  document.getElementById("scanHelp").hidden = false;
  document.getElementById("scanStatus").textContent = "เลือกพื้นที่บนภาพที่มีข้อความ";
});
viewport.addEventListener("pointerdown", (event) => {
  if (!selecting) return;
  event.preventDefault();
  selectionStart = { x: event.clientX, y: event.clientY };
  selectionBox.style.display = "block";
  updateSelection(event);
  viewport.setPointerCapture(event.pointerId);
});
document.addEventListener("pointermove", (event) => {
  if (selecting && selectionStart) updateSelection(event);
});
document.addEventListener("pointerup", (event) => {
  if (selecting) finishSelection(event);
});
document.addEventListener("pointercancel", () => {
  if (!selecting || !selectionStart) return;
  document.getElementById("scanStatus").textContent = "ปล่อยเมาส์เพื่อยืนยันพื้นที่ที่เลือก";
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
  meaning.value = "กำลังค้นหาความหมาย...";
  const trimmed = text.replace(/\s+/g, "").trim();
  if (trimmed === "切れてる" || trimmed.includes("切れてる")) {
    meaning.value = "切れてる (きれてる) มาจาก 切れる (きれる) รูป ている ใช้บอกสภาพที่เกิดขึ้นแล้วหรือกำลังคงอยู่: ตัดขาด/ขาดออกจากกัน, สายหรือของหมดอายุ/หมดสภาพ, หรือในบริบทการสนทนาอาจหมายถึงการเชื่อมต่อขาด ต้องดูประโยครอบข้างประกอบ";
    return;
  }
  try {
    const response = await fetch(`${DICTIONARY_ENDPOINT}${encodeURIComponent(trimmed)}`);
    if (!response.ok) throw new Error(`Dictionary returned ${response.status}`);
    const data = await response.json();
    const entry = data.data && data.data[0];
    if (!entry) {
      meaning.value = "ยังไม่พบคำนี้ในพจนานุกรม ลองเลือกเฉพาะคำศัพท์สั้น ๆ หรือเติมบริบทในช่องภาษาญี่ปุ่น";
      return;
    }
    const senses = (entry.senses || []).slice(0, 3).map((sense) => sense.english_definitions.join(", ")).join(" | ");
    const readings = (entry.japanese || []).map((word) => word.reading).filter(Boolean).join(", ");
    meaning.value = `${entry.japanese?.[0]?.word || trimmed}${readings ? ` (${readings})` : ""}: ${senses || "พบคำศัพท์ แต่ไม่มีคำอธิบาย"}. ความหมายภาษาไทยอาจเปลี่ยนตามบริบทของประโยค`;
  } catch (error) {
    meaning.value = "ค้นหาความหมายไม่สำเร็จในขณะนี้ แต่คุณยังสามารถปรับคำแปลด้านบนเองได้";
    console.error("Dictionary lookup failed:", error);
  }
}

async function translateText() {
  const text = document.getElementById("japaneseText").value.trim();
  const result = document.getElementById("translationResult");
  const button = document.getElementById("translateButton");
  if (!text) { result.value = "กรุณาใส่ข้อความภาษาญี่ปุ่นก่อนแปล"; return; }
  button.disabled = true;
  button.textContent = "กำลังแปล...";
  result.value = "กำลังเชื่อมต่อบริการแปลภาษา";
  try {
    const chunks = text.match(/[\s\S]{1,450}/g) || [];
    const translations = [];
    for (const chunk of chunks) {
      translations.push(await translateChunk(chunk));
      result.value = `กำลังแปล ${translations.length} / ${chunks.length} ส่วน`;
    }
    latestApiTranslation = translations.join(" ");
    result.value = latestApiTranslation;
    explainMeaning(text);
  } catch (error) {
    const fallback = getFallbackTranslation(text);
    if (fallback) {
      latestApiTranslation = fallback.translation;
      result.value = fallback.translation;
      document.getElementById("meaningResult").value = fallback.meaning;
      document.getElementById("scanStatus").textContent = "ใช้คำแปลสำรองในเครื่อง เพราะ API ภายนอกไม่พร้อมใช้งาน";
    } else {
      result.value = `พบข้อความแล้ว แต่แปลไม่สำเร็จ: ${error.message}`;
      document.getElementById("scanStatus").textContent = "OCR สำเร็จแล้ว แก้ข้อความแล้วลองใหม่ได้";
    }
    console.error("Translation failed:", error);
  } finally {
    button.disabled = false;
    button.textContent = "แปลเป็นภาษาไทย";
  }
}
document.getElementById("translateButton").addEventListener("click", translateText);
document.getElementById("saveTranslation").addEventListener("click", async () => {
  const saveStatus = document.getElementById("saveStatus");
  const translation = document.getElementById("translationResult").value.trim();
  if (!translation) {
    saveStatus.textContent = "ยังไม่มีคำแปลให้บันทึก";
    return;
  }
  if (location.protocol === "file:") {
    localStorage.setItem(`manga-translation-page-${currentPage}`, translation);
    saveStatus.textContent = "บันทึกคำแปลไว้ในเครื่องแล้ว";
    return;
  }
  try {
    const response = await fetch(`${TRANSLATION_API}/${currentPage}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        japanese: document.getElementById("japaneseText").value,
        translation,
        meaning: document.getElementById("meaningResult").value
      })
    });
    if (!response.ok) throw new Error(`Translation API returned ${response.status}`);
    localStorage.setItem(`manga-translation-page-${currentPage}`, translation);
    saveStatus.textContent = "บันทึกคำแปลเข้า API แล้ว";
  } catch (error) {
    saveStatus.textContent = "บันทึก API ไม่สำเร็จ กรุณาเปิดผ่านเซิร์ฟเวอร์";
    console.error("Failed to save translation:", error);
  }
});
document.getElementById("restoreTranslation").addEventListener("click", () => {
  const savedTranslation = localStorage.getItem(`manga-translation-page-${currentPage}`);
  document.getElementById("translationResult").value = savedTranslation || latestApiTranslation;
  document.getElementById("saveStatus").textContent = savedTranslation ? "คืนค่าคำแปลที่บันทึกไว้แล้ว" : "คืนค่าผลแปลล่าสุดจาก API";
});
