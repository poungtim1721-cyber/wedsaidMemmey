(async function () {
  const showError = (container, error) => {
    container.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.setAttribute("role", "alert");
    cell.textContent = `โหลดข้อมูลจาก Supabase ไม่สำเร็จ: ${error.message}`;
    row.appendChild(cell);
    container.appendChild(row);
  };

  try {
    const client = window.getSupabaseClient();
    const level = window.location.pathname.match(/文法N([1-5])\.html$/)?.[1];
    const tableBody = document.querySelector("tbody");
    const paginationContainer = document.querySelector(".pagination-container");
    if (!level || !tableBody || !paginationContainer) {
      throw new Error("ไม่พบระดับหรือส่วนแสดงรายการไวยากรณ์ในหน้านี้");
    }
    const result = await client
      .from("jlpt_grammar")
      .select("pattern,reading,meaning,sort_order")
      .eq("level", `N${level}`)
      .order("sort_order")
      .order("id")
      .order("pattern");
    if (result.error) {
      throw new Error(`Could not load jlpt_grammar: ${result.error.message}`);
    }

    const pageSize = 20;
    const params = new URLSearchParams(window.location.search);
    const pageCount = Math.max(1, Math.ceil(result.data.length / pageSize));
    const currentPage = Math.min(pageCount, Math.max(1, Number(params.get("page")) || 1));
    const items = result.data.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    tableBody.replaceChildren();
    if (items.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.textContent = "ยังไม่มีข้อมูลไวยากรณ์ระดับนี้ในฐานข้อมูล";
      row.appendChild(cell);
      tableBody.appendChild(row);
    } else {
      items.forEach((item, index) => {
        const row = document.createElement("tr");
        for (const value of [
          String((currentPage - 1) * pageSize + index + 1),
          item.reading,
          item.pattern,
          item.meaning
        ]) {
          const cell = document.createElement("td");
          cell.textContent = value || "";
          row.appendChild(cell);
        }
        tableBody.appendChild(row);
      });
    }

    const status = paginationContainer.querySelector("p");
    if (status) {
      status.textContent = `ขณะนี้กำลังดูหน้า ${currentPage} จากทั้งหมด ${pageCount} หน้า`;
    }
    const list = paginationContainer.querySelector(".pagination");
    if (list) {
      list.replaceChildren();
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const item = document.createElement("li");
        if (pageNumber === currentPage) item.className = "active";
        const link = document.createElement("a");
        link.href = `?page=${pageNumber}`;
        link.textContent = String(pageNumber);
        item.appendChild(link);
        list.appendChild(item);
      }
    }
  } catch (error) {
    const tableBody = document.querySelector("tbody");
    if (tableBody) showError(tableBody, error);
  }
})();
