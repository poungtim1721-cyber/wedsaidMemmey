(async function () {
  const levels = ["N5", "N4", "N3", "N2", "N1"];
  const pageSize = 20;
  const grid = document.getElementById("kanjiGrid");
  const landing = document.querySelector(".landing-section");
  const infoBox = document.querySelector(".info-box");
  const rows = document.getElementById("infoRows");
  const title = document.getElementById("infoTitle");
  const requestedLevel = window.location.hash.slice(1).toUpperCase();
  const page = Math.max(1, Number(new URLSearchParams(window.location.search).get("page")) || 1);

  function appendCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value || "-";
    row.appendChild(cell);
  }

  try {
    const kanji = await window.fetchAllSupabaseRows(
      "jlpt_kanji",
      "level,character,readings_on,readings_kun,meaning",
      "character"
    );
    document.querySelectorAll(".level-menu-card").forEach((card) => {
      const level = card.getAttribute("href").slice(1);
      const count = kanji.filter((item) => item.level === level).length;
      card.querySelector("small").textContent = `${count} ตัว`;
    });
    for (const level of levels) {
      const items = kanji.filter((item) => item.level === level);
      const card = document.createElement("section");
      card.className = "level-card";
      card.hidden = requestedLevel !== level;
      const heading = document.createElement("h2");
      heading.textContent = `漢字 ${level} (${items.length} ตัว)`;
      card.appendChild(heading);
      const list = document.createElement("div");
      list.className = "kanji-list";
      const pages = Math.max(1, Math.ceil(items.length / pageSize));
      const currentPage = Math.min(page, pages);
      for (const item of items.slice((currentPage - 1) * pageSize, currentPage * pageSize)) {
        const kanjiItem = document.createElement("div");
        kanjiItem.className = "kanji-item";
        const character = document.createElement("strong");
        character.textContent = item.character;
        const meaning = document.createElement("span");
        meaning.textContent = item.meaning || "";
        kanjiItem.append(character, meaning);
        list.appendChild(kanjiItem);
      }
      card.appendChild(list);
      grid.appendChild(card);

      if (requestedLevel === level) {
        const levelRows = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
        title.textContent = `漢字ระดับ ${level} (${items.length} ตัว)`;
        for (const item of levelRows) {
          const row = document.createElement("tr");
          appendCell(row, item.character);
          appendCell(row, (item.readings_on || []).join("、"));
          appendCell(row, (item.readings_kun || []).join("、"));
          appendCell(row, item.meaning);
          appendCell(row, item.level);
          rows.appendChild(row);
        }
        const pagination = document.getElementById("pagination");
        for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
          const link = document.createElement("a");
          link.href = `漢字.html?page=${pageNumber}#${level}`;
          link.textContent = String(pageNumber);
          link.className = pageNumber === currentPage ? "active" : "";
          link.setAttribute("aria-label", `หน้าที่ ${pageNumber}`);
          pagination.appendChild(link);
        }
      }
    }

    if (levels.includes(requestedLevel)) {
      landing.hidden = true;
      infoBox.hidden = false;
      grid.hidden = false;
      const back = document.createElement("a");
      back.className = "all-kanji";
      back.href = "漢字.html";
      back.textContent = "← กลับหน้าเลือกระดับ";
      document.querySelector(".top-card").prepend(back);
    } else {
      infoBox.hidden = true;
      grid.hidden = true;
    }
  } catch (error) {
    window.showSupabaseError(rows, error);
    infoBox.hidden = false;
  }
})();
