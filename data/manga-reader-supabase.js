(async function () {
  const script = document.currentScript;
  const series = script && script.dataset.series;
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

  function showMessage(container, message) {
    container.replaceChildren();
    if (container.tagName === "TBODY") {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.className = "no-data";
      cell.setAttribute("role", "status");
      cell.textContent = message;
      row.appendChild(cell);
      container.appendChild(row);
      return;
    }
    const text = document.createElement("p");
    text.className = "no-data";
    text.setAttribute("role", "status");
    text.textContent = message;
    container.appendChild(text);
  }

  function buildChapterUI() {
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
    tableBody.replaceChildren();
    const translations = chapters[currentChapter].pages[index].translations;
    if (translations === null) {
      showMessage(tableBody, "โหลดคำแปลจาก Supabase ไม่สำเร็จ");
      return;
    }
    if (translations.length === 0) {
      showMessage(tableBody, "ไม่มีข้อมูลคำแปลในหน้านี้");
      return;
    }

    translations.forEach((translation, translationIndex) => {
      const row = document.createElement("tr");
      for (const value of [
        String(translation.line_number || translationIndex + 1),
        translation.romaji || "-",
        translation.japanese || "-",
        translation.meaning || "-"
      ]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      }
      tableBody.appendChild(row);
    });
  }

  function buildPageTabs() {
    pageTabs.replaceChildren();
    chapters[currentChapter].pages.forEach((page, index) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = `page-tab${page.translations && page.translations.length > 0 ? " has-translation" : ""}`;
      tab.textContent = String(index + 1);
      tab.addEventListener("click", () => showTranslationPage(index));
      pageTabs.appendChild(tab);
    });
  }

  function showTranslationPage(index) {
    const pages = chapters[currentChapter].pages;
    activeTranslationPage = Math.max(0, Math.min(index, pages.length - 1));
    detailTitle.textContent = `หน้า ${activeTranslationPage + 1}`;
    renderTable(activeTranslationPage);
    [...pageTabs.children].forEach((tab, tabIndex) => {
      tab.classList.toggle("active", tabIndex === activeTranslationPage);
    });
    document.getElementById("detailPrev").disabled = activeTranslationPage === 0;
    document.getElementById("detailNext").disabled = activeTranslationPage === pages.length - 1;
  }

  function goToPage(pageIndex) {
    const pages = chapters[currentChapter].pages;
    currentPage = Math.max(0, Math.min(pageIndex, pages.length - 1));
    track.style.transform = `translateX(-${currentPage * 100}%)`;
    document.getElementById("pageCounter").textContent = `หน้า ${currentPage + 1} / ${pages.length}`;
    [...dots.children].forEach((dot, index) => dot.classList.toggle("active", index === currentPage));
    document.getElementById("previousPage").disabled = currentPage === 0 && currentChapter === 0;
    document.getElementById("nextPage").disabled =
      currentPage === pages.length - 1 && currentChapter === chapters.length - 1;
  }

  function loadChapter(chapterIndex, startAtEnd = false) {
    currentChapter = chapterIndex;
    const chapter = chapters[currentChapter];
    chapterSelect.value = String(currentChapter);
    [...chapterGrid.children].forEach((card, index) => {
      card.classList.toggle("active", index === currentChapter);
    });
    track.replaceChildren();
    dots.replaceChildren();

    chapter.pages.forEach((pageData, index) => {
      const article = document.createElement("article");
      article.className = "manga-page";
      article.setAttribute("aria-label", `หน้าที่ ${index + 1}`);
      const image = document.createElement("img");
      image.src = encodeURI(pageData.image_path);
      image.alt = `มังงะหน้าที่ ${index + 1}`;
      image.loading = index === 0 ? "eager" : "lazy";
      article.appendChild(image);
      track.appendChild(article);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `ไปหน้าที่ ${index + 1}`);
      dot.addEventListener("click", () => goToPage(index));
      dots.appendChild(dot);
    });

    goToPage(startAtEnd ? chapter.pages.length - 1 : 0);
    if (modalBackdrop.classList.contains("open")) {
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

  function openChapterModal() {
    chapterModalBackdrop.classList.add("open");
    chapterModalBackdrop.setAttribute("aria-hidden", "false");
  }

  function closeChapterModal() {
    chapterModalBackdrop.classList.remove("open");
    chapterModalBackdrop.setAttribute("aria-hidden", "true");
  }

  function openTranslationModal() {
    buildPageTabs();
    showTranslationPage(currentPage);
    modalBackdrop.classList.add("open");
    modalBackdrop.setAttribute("aria-hidden", "false");
  }

  function closeTranslationModal() {
    modalBackdrop.classList.remove("open");
    modalBackdrop.setAttribute("aria-hidden", "true");
  }

  function attachEvents() {
    chapterSelect.addEventListener("change", (event) => loadChapter(Number(event.target.value)));
    document.getElementById("previousPage").addEventListener("click", () => changePage(-1));
    document.getElementById("nextPage").addEventListener("click", () => changePage(1));
    document.getElementById("nextFooter").addEventListener("click", () => changePage(1));
    document.getElementById("lastFooter").addEventListener("click", () => {
      goToPage(chapters[currentChapter].pages.length - 1);
    });
    document.getElementById("openChapterModal").addEventListener("click", openChapterModal);
    document.getElementById("closeChapterModal").addEventListener("click", closeChapterModal);
    chapterModalBackdrop.addEventListener("click", (event) => {
      if (event.target === chapterModalBackdrop) closeChapterModal();
    });
    document.getElementById("closeReader").addEventListener("click", () => {
      if (history.length > 1) history.back();
      else window.location.href = "index.html";
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") changePage(-1);
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        changePage(1);
      }
    });
    const viewport = document.getElementById("pageViewport");
    viewport.addEventListener("pointerdown", (event) => {
      dragStartX = event.clientX;
      viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener("pointerup", (event) => {
      if (dragStartX === null) return;
      const distance = event.clientX - dragStartX;
      if (Math.abs(distance) > 45) changePage(distance < 0 ? 1 : -1);
      dragStartX = null;
    });
    document.getElementById("openTranslation").addEventListener("click", () => {
      if (modalBackdrop.classList.contains("open")) closeTranslationModal();
      else openTranslationModal();
    });
    document.getElementById("closeTranslation").addEventListener("click", closeTranslationModal);
    modalBackdrop.addEventListener("click", (event) => {
      if (event.target === modalBackdrop) closeTranslationModal();
    });
    document.getElementById("detailPrev").addEventListener("click", () => {
      showTranslationPage(activeTranslationPage - 1);
    });
    document.getElementById("detailNext").addEventListener("click", () => {
      showTranslationPage(activeTranslationPage + 1);
    });
  }

  if (!series || !Array.isArray(imagesByChapter) || imagesByChapter.length === 0) {
    showMessage(track, "ไม่พบข้อมูลหน้ามังงะในเครื่อง");
    showMessage(tableBody, "ไม่พบข้อมูลหน้ามังงะในเครื่อง");
    return;
  }

  imagesByChapter.forEach((imageFiles, chapterIndex) => {
    const pages = imageFiles.filter(Boolean).map((imagePath) => ({
      image_path: imagePath,
      translations: []
    }));
    if (pages.length > 0) {
      chapters.push({
        number: chapterIndex + 1,
        title: `บทที่ ${chapterIndex + 1}`,
        pages
      });
    }
  });

  if (chapters.length === 0) {
    showMessage(track, "ยังไม่มีรูปหน้ามังงะในเครื่อง");
    showMessage(tableBody, "ยังไม่มีรูปหน้ามังงะในเครื่อง");
    return;
  }

  attachEvents();
  buildChapterUI();
  loadChapter(0);

  try {
    const client = window.getSupabaseClient();
    const { data, error } = await client
      .from("manga_translations")
      .select("chapter_number,page_number,line_number,romaji,japanese,meaning")
      .eq("series", series)
      .order("chapter_number")
      .order("page_number")
      .order("line_number")
      .order("id");
    if (error) {
      throw new Error(`โหลดคำแปลจาก Supabase ไม่สำเร็จ: ${error.message}`);
    }

    data.forEach((translation) => {
      const chapter = chapters.find((item) => item.number === translation.chapter_number);
      const page = chapter && chapter.pages[translation.page_number - 1];
      if (page) page.translations.push(translation);
    });

    if (modalBackdrop.classList.contains("open")) {
      buildPageTabs();
      showTranslationPage(activeTranslationPage);
    }
  } catch (error) {
    chapters.forEach((chapter) => chapter.pages.forEach((page) => {
      page.translations = null;
    }));
    if (modalBackdrop.classList.contains("open")) {
      showTranslationPage(activeTranslationPage);
    }
    console.error(error);
  }
})();
