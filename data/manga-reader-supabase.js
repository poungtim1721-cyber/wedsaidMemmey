(async function () {
  // 1. ตรวจสอบ series อย่างปลอดภัย (บังคับให้เป็น manga-jp หากหาไม่เจอ)
  const script = document.currentScript || document.querySelector('script[data-series]');
  const series = (script && script.dataset.series) || "manga-jp"; 
  
  // 2. รับค่า manga_id จาก URL (?manga_id=1) เพื่อดึงคำศัพท์
  const params = new URLSearchParams(window.location.search);
  const vocabularyMangaId = Number(params.get("manga_id") || params.get("id") || 1);
  const usesVocabulary = true; // บังคับให้เป็นโหมดดึงคำศัพท์ manga_vocabularies เสมอ

  // 3. เตรียมข้อมูลรูปภาพ
  const imagesByChapter = window.mangaImages && window.mangaImages[series];
  
  const track = document.getElementById("pageTrack");
  const dots = document.getElementById("pageDots");
  const chapterSelect = document.getElementById("chapterSelect");
  const chapterGrid = document.getElementById("chapterGrid");
  const chapterModalBackdrop = document.getElementById("chapterModalBackdrop");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const pageTabs = document.getElementById("pageTabs");
  const detailTitle = document.getElementById("detailTitle");
  const tableBody = document.getElementById("translationTableBody");
  
  const chapters = [];
  let currentChapter = 0;
  let currentPage = 0;
  let activeTranslationPage = 0;
  let dragStartX = null;
  let currentUser = null;

  function showMessage(container, message) {
    if (!container) return;
    container.replaceChildren();
    if (container.tagName === "TBODY") {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.className = "no-data";
      cell.textContent = message;
      row.appendChild(cell);
      container.appendChild(row);
      return;
    }
    const text = document.createElement("p");
    text.className = "no-data";
    text.textContent = message;
    container.appendChild(text);
  }

  // --- เริ่มต้นโหลดรูปมังงะ ---
  if (!Array.isArray(imagesByChapter) || imagesByChapter.length === 0) {
    showMessage(track, "ไม่พบข้อมูลรูปมังงะ กรุณาตรวจสอบ window.mangaImages");
    return; // หยุดการทำงานถ้าหารูปไม่เจอ
  }

  imagesByChapter.forEach((imageFiles, chapterIndex) => {
    const pages = imageFiles.filter(Boolean).map((imagePath) => ({
      image_path: imagePath,
      translations: [],
      vocabularies: []
    }));
    if (pages.length > 0) {
      chapters.push({
        number: chapterIndex + 1,
        title: `ตอนที่ ${chapterIndex + 1}`,
        pages
      });
    }
  });

  if (chapters.length === 0) {
    showMessage(track, "ยังไม่มีรูปหน้ามังงะในเครื่อง");
    return;
  }

  // --- ฟังก์ชันแสดงผล ---
  function buildChapterUI() {
    if(!chapterSelect || !chapterGrid) return;
    chapterSelect.replaceChildren();
    chapterGrid.replaceChildren();
    chapters.forEach((chapter, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = chapter.title;
      chapterSelect.appendChild(option);

      const button = document.createElement("button");
      button.type = "button";
      button.className = `chapter-card ${index === currentChapter ? "active" : ""}`;
      button.textContent = chapter.title;
      button.addEventListener("click", () => {
        loadChapter(index);
        closeChapterModal();
      });
      chapterGrid.appendChild(button);
    });
  }

  function renderTable(index) {
    if(!tableBody) return;
    tableBody.replaceChildren();
    const entries = chapters[currentChapter].pages[index].vocabularies;
    
    if (!entries) {
      showMessage(tableBody, "กำลังโหลดหรือโหลดข้อมูลล้มเหลว...");
      return;
    }
    if (entries.length === 0) {
      showMessage(tableBody, "ไม่มีข้อมูลคำศัพท์ในหน้านี้");
      return;
    }

    entries.forEach((entry, entryIndex) => {
      const row = document.createElement("tr");
      for (const value of [
        String(entry.seq_no || entryIndex + 1),
        entry.kana || "-",
        entry.kanji || "-",
        entry.meaning || "-"
      ]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      }
      tableBody.appendChild(row);
    });
  }

  function buildPageTabs() {
    if(!pageTabs) return;
    pageTabs.replaceChildren();
    chapters[currentChapter].pages.forEach((page, index) => {
      const tab = document.createElement("button");
      tab.type = "button";
      const entries = page.vocabularies;
      tab.className = `page-tab${entries && entries.length > 0 ? " has-translation" : ""}`;
      tab.textContent = String(index + 1);
      tab.addEventListener("click", () => showTranslationPage(index));
      pageTabs.appendChild(tab);
    });
  }

  function showTranslationPage(index) {
    const pages = chapters[currentChapter].pages;
    activeTranslationPage = Math.max(0, Math.min(index, pages.length - 1));
    if(detailTitle) detailTitle.textContent = `หน้า ${activeTranslationPage + 1}`;
    renderTable(activeTranslationPage);
    if(pageTabs) {
      [...pageTabs.children].forEach((tab, tabIndex) => {
        tab.classList.toggle("active", tabIndex === activeTranslationPage);
      });
    }
    const prevBtn = document.getElementById("detailPrev");
    const nextBtn = document.getElementById("detailNext");
    if(prevBtn) prevBtn.disabled = activeTranslationPage === 0;
    if(nextBtn) nextBtn.disabled = activeTranslationPage === pages.length - 1;
  }

  function goToPage(pageIndex) {
    const pages = chapters[currentChapter].pages;
    currentPage = Math.max(0, Math.min(pageIndex, pages.length - 1));
    if(track) track.style.transform = `translateX(-${currentPage * 100}%)`;
    const pCounter = document.getElementById("pageCounter");
    if(pCounter) pCounter.textContent = `หน้า ${currentPage + 1} / ${pages.length}`;
    if(dots) {
      [...dots.children].forEach((dot, index) => dot.classList.toggle("active", index === currentPage));
    }
    const prevPage = document.getElementById("previousPage");
    const nextPage = document.getElementById("nextPage");
    if(prevPage) prevPage.disabled = currentPage === 0 && currentChapter === 0;
    if(nextPage) nextPage.disabled = currentPage === pages.length - 1 && currentChapter === chapters.length - 1;
  }

  function loadChapter(chapterIndex, startAtEnd = false) {
    currentChapter = chapterIndex;
    const chapter = chapters[currentChapter];
    if(chapterSelect) chapterSelect.value = String(currentChapter);
    if(chapterGrid) {
      [...chapterGrid.children].forEach((card, index) => {
        card.classList.toggle("active", index === currentChapter);
      });
    }
    if(track) track.replaceChildren();
    if(dots) dots.replaceChildren();

    chapter.pages.forEach((pageData, index) => {
      const article = document.createElement("article");
      article.className = "manga-page";
      article.setAttribute("aria-label", `หน้าที่ ${index + 1}`);
      const image = document.createElement("img");
      image.src = encodeURI(pageData.image_path);
      image.alt = `มังงะหน้าที่ ${index + 1}`;
      image.loading = index === 0 ? "eager" : "lazy";
      article.appendChild(image);
      if(track) track.appendChild(article);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `ไปหน้าที่ ${index + 1}`);
      dot.addEventListener("click", () => goToPage(index));
      if(dots) dots.appendChild(dot);
    });

    goToPage(startAtEnd ? chapter.pages.length - 1 : 0);
    if (modalBackdrop && modalBackdrop.classList.contains("open")) {
      buildPageTabs();
      showTranslationPage(currentPage);
    }
  }

  function changePage(step) {
    const target = currentPage + step;
    if (target >= chapters[currentChapter].pages.length && currentChapter < chapters.length - 1) {
      loadChapter(currentChapter + 1);
    } else if (target < 0 && currentChapter > 0) {
      loadChapter(currentChapter - 1, true);
    } else if (target >= 0 && target < chapters[currentChapter].pages.length) {
      goToPage(target);
    }
  }

  // --- Modal Logic ---
  function openChapterModal() { if(chapterModalBackdrop) { chapterModalBackdrop.classList.add("open"); chapterModalBackdrop.setAttribute("aria-hidden", "false"); } }
  function closeChapterModal() { if(chapterModalBackdrop) { chapterModalBackdrop.classList.remove("open"); chapterModalBackdrop.setAttribute("aria-hidden", "true"); } }
  function openTranslationModal() { 
    buildPageTabs(); showTranslationPage(currentPage); 
    if(modalBackdrop) { modalBackdrop.classList.add("open"); modalBackdrop.setAttribute("aria-hidden", "false"); } 
  }
  function closeTranslationModal() { if(modalBackdrop) { modalBackdrop.classList.remove("open"); modalBackdrop.setAttribute("aria-hidden", "true"); } }

  // --- Attach Events ---
  function attachEvents() {
    document.getElementById("chapterSelect")?.addEventListener("change", (e) => loadChapter(Number(e.target.value)));
    document.getElementById("previousPage")?.addEventListener("click", () => changePage(-1));
    document.getElementById("nextPage")?.addEventListener("click", () => changePage(1));
    document.getElementById("nextFooter")?.addEventListener("click", () => changePage(1));
    document.getElementById("lastFooter")?.addEventListener("click", () => goToPage(chapters[currentChapter].pages.length - 1));
    document.getElementById("openChapterModal")?.addEventListener("click", openChapterModal);
    document.getElementById("closeChapterModal")?.addEventListener("click", closeChapterModal);
    document.getElementById("openTranslation")?.addEventListener("click", () => {
      if (modalBackdrop && modalBackdrop.classList.contains("open")) closeTranslationModal(); else openTranslationModal();
    });
    document.getElementById("closeTranslation")?.addEventListener("click", closeTranslationModal);
    document.getElementById("detailPrev")?.addEventListener("click", () => showTranslationPage(activeTranslationPage - 1));
    document.getElementById("detailNext")?.addEventListener("click", () => showTranslationPage(activeTranslationPage + 1));
    document.getElementById("closeReader")?.addEventListener("click", () => { history.length > 1 ? history.back() : window.location.href = "index.html"; });

    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") changePage(-1);
      if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); changePage(1); }
    });

    const viewport = document.getElementById("pageViewport");
    if(viewport) {
      viewport.addEventListener("pointerdown", (e) => { dragStartX = e.clientX; viewport.setPointerCapture(e.pointerId); });
      viewport.addEventListener("pointerup", (e) => {
        if (dragStartX === null) return;
        const distance = e.clientX - dragStartX;
        if (Math.abs(distance) > 45) changePage(distance < 0 ? 1 : -1);
        dragStartX = null;
      });
    }
  }

  // สร้าง UI หน้าจอ
  buildChapterUI();
  attachEvents();
  loadChapter(0);

  // --- ดึงข้อมูลคำแปลจาก Supabase ---
  try {
    // ป้องกันกรณีที่ getSupabaseClient() เรียกไม่ติด 
    const client = window.getSupabaseClient ? window.getSupabaseClient() : (window.supabaseClient || window.supabase);
    if (!client) throw new Error("ไม่พบ Supabase Client");

    const { data, error } = await client
      .from("manga_vocabularies")
      .select("vocab_id,page_no,seq_no,kana,kanji,meaning")
      .eq("manga_id", vocabularyMangaId)
      .order("page_no")
      .order("seq_no")
      .order("vocab_id");

    if (error) {
      throw new Error(`โหลดคำศัพท์จาก Supabase ไม่สำเร็จ: ${error.message}`);
    }

    // เอาข้อมูลยัดใส่ในเลขหน้าที่ตรงกัน
    (data || []).forEach((entry) => {
      const chapterNumber = 1; // สมมติว่ามี chapter เดียว 
      const pageNumber = entry.page_no;
      const chapter = chapters.find((item) => item.number === chapterNumber);
      const page = chapter && chapter.pages[pageNumber - 1];
      if (page) {
        page.vocabularies.push(entry);
      }
    });

    if (modalBackdrop && modalBackdrop.classList.contains("open")) {
      buildPageTabs();
      showTranslationPage(activeTranslationPage);
    }
  } catch (error) {
    console.error("Supabase Error:", error);
    showMessage(tableBody, "ไม่สามารถดึงข้อมูลคำแปลจากฐานข้อมูลได้");
  }
})();