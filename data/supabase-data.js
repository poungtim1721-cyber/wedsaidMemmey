window.fetchAllSupabaseRows = async function (table, columns, orderColumn) {
  const client = window.getSupabaseClient();
  const pageSize = 1000;
  const rows = [];

  for (let start = 0; ; start += pageSize) {
    const request = client
      .from(table)
      .select(columns)
      .order(orderColumn)
      .order("id")
      .range(start, start + pageSize - 1);
    const { data, error } = await request;
    if (error) {
      throw new Error(`Could not load ${table}: ${error.message}`);
    }
    rows.push(...data);
    if (data.length < pageSize) {
      return rows;
    }
  }
};

window.showSupabaseError = function (container, error) {
  container.replaceChildren();
  const message = `โหลดข้อมูลจาก Supabase ไม่สำเร็จ: ${error.message}`;
  if (container.tagName === "TBODY") {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.setAttribute("role", "alert");
    cell.textContent = message;
    row.appendChild(cell);
    container.appendChild(row);
    return;
  }
  const paragraph = document.createElement("p");
  paragraph.className = "data-error";
  paragraph.setAttribute("role", "alert");
  paragraph.textContent = message;
  container.appendChild(paragraph);
};
