(async function () {
  const pageSize = 20;
  const level = document.getElementById("level");
  const search = document.getElementById("search");
  const rows = document.getElementById("rows");
  const pagination = document.getElementById("pagination");
  const count = document.getElementById("count");
  let allItems;
  let currentPage = 1;

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
    currentPage = Math.min(currentPage, pages);
    const visible = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    rows.replaceChildren();

    if (visible.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
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
  } catch (error) {
    window.showSupabaseError(rows, error);
    count.textContent = "";
    pagination.replaceChildren();
  }
})();
