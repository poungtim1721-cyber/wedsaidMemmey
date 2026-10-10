(async function () {
  const pageSize = 20;
  const level = document.getElementById("level");
  const search = document.getElementById("search");
  const rows = document.getElementById("rows");
  const pagination = document.getElementById("pagination");
  const count = document.getElementById("count");
  let allItems;
  let currentPage = 1;
  let currentPageCount = 1;

  function getFavoriteVocab() {
    const saved = JSON.parse(localStorage.getItem("favoriteVocab") || "[]");
    return Array.isArray(saved) ? saved : [];
  }

  function isFavorite(item) {
    return getFavoriteVocab().some((favorite) =>
      favorite.word === item.word && favorite.level === item.level
    );
  }

  function toggleFavorite(item) {
    const favorites = getFavoriteVocab();
    const index = favorites.findIndex((favorite) =>
      favorite.word === item.word && favorite.level === item.level
    );
    if (index === -1) {
      favorites.unshift({ ...item, date: new Date().toISOString() });
    } else {
      favorites.splice(index, 1);
    }
    localStorage.setItem("favoriteVocab", JSON.stringify(favorites));
    render();
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const items = allItems.filter((item) => {
      const matchesLevel = level.value === "ALL" || item.level === level.value;
      const matchesQuery = !query || [item.word, item.reading, item.meaning]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
      return matchesLevel && matchesQuery;
    });
    const pages = Math.max(1, Math.ceil(items.length / pageSize));
    currentPageCount = pages;
    currentPage = Math.min(currentPage, pages);
    const visible = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    rows.replaceChildren();

    if (visible.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = allItems.length === 0
        ? "ยังไม่มีข้อมูลคำศัพท์ในฐานข้อมูล"
        : "ไม่พบคำศัพท์ที่ตรงกับการค้นหา";
      row.appendChild(cell);
      rows.appendChild(row);
    } else {
      for (const item of visible) {
        const row = document.createElement("tr");
        for (const value of [item.word, item.reading, item.meaning, item.level]) {
          const cell = document.createElement("td");
          cell.textContent = value || "";
          row.appendChild(cell);
        }
        const favoriteCell = document.createElement("td");
        const favoriteButton = document.createElement("button");
        const favorite = isFavorite(item);
        favoriteButton.type = "button";
        favoriteButton.className = "favorite-toggle";
        favoriteButton.textContent = favorite ? "★" : "☆";
        favoriteButton.setAttribute("aria-label", favorite ? "นำออกจากคำศัพท์ที่ชอบ" : "เพิ่มในคำศัพท์ที่ชอบ");
        favoriteButton.setAttribute("aria-pressed", String(favorite));
        favoriteButton.addEventListener("click", () => toggleFavorite(item));
        favoriteCell.appendChild(favoriteButton);
        row.appendChild(favoriteCell);
        rows.appendChild(row);
      }
    }

    count.textContent = `${items.length.toLocaleString()} คำศัพท์`;
    pagination.replaceChildren();
    const addButton = (label, page, active = false) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.className = active ? "active" : "";
      button.disabled = page < 1 || page > pages;
      button.addEventListener("click", () => {
        currentPage = page;
        render();
      });
      pagination.appendChild(button);
    };
    addButton("‹", currentPage - 1);
    for (let page = 1; page <= pages; page += 1) {
      if (pages > 7 && page !== 1 && page !== pages && Math.abs(page - currentPage) > 1) {
        if (page === 2 || page === pages - 1) {
          const ellipsis = document.createElement("span");
          ellipsis.className = "ellipsis";
          ellipsis.textContent = "...";
          pagination.appendChild(ellipsis);
        }
        continue;
      }
      addButton(String(page), page, page === currentPage);
    }
    addButton("›", currentPage + 1);
  }

  level.addEventListener("change", () => {
    currentPage = 1;
    render();
  });
  search.addEventListener("input", () => {
    currentPage = 1;
    render();
  });

  try {
    allItems = await window.fetchAllSupabaseRows(
      "jlpt_vocabulary",
      "level,word,reading,meaning",
      "word"
    );
    render();
    if (window.startReadingTracker) {
      window.startReadingTracker({
        type: "vocabulary",
        title: "คำศัพท์ JLPT",
        mangaId: "vocabulary",
        getProgress: () => ({
          chapter: level.value === "ALL" ? "ทุกระดับ" : "ระดับ " + level.value,
          page: currentPage,
          totalPages: currentPageCount
        })
      });
    }
  } catch (error) {
    window.showSupabaseError(rows, error);
    count.textContent = "";
    pagination.replaceChildren();
  }
})();
