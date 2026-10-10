window.loadSupabaseMangaCovers = async function () {
  if (typeof window.getSupabaseClient !== "function") {
    throw new Error("Supabase client is not configured.");
  }

  const client = window.getSupabaseClient();
  const { data, error } = await client
    .from("manga_covers")
    .select("id, cover_path");

  if (error) {
    throw new Error(`Could not load manga covers: ${error.message}`);
  }

  const covers = new Map();
  data.forEach(function (cover) {
    const { data: publicUrl } = client.storage
      .from("manga-covers")
      .getPublicUrl(cover.cover_path);
    covers.set(cover.id, publicUrl.publicUrl);
  });

  const missing = Array.from(new Set(
    Array.from(document.querySelectorAll("img[data-manga-cover]"))
      .map(image => image.dataset.mangaCover)
      .filter(id => !covers.has(id))
  ));
  if (missing.length > 0) {
    throw new Error(`Missing cover rows in manga_covers: ${missing.join(", ")}`);
  }

  return covers;
};

window.applySupabaseMangaCovers = async function () {
  const images = Array.from(document.querySelectorAll("img[data-manga-cover]"));
  if (images.length === 0) return;

  const status = document.getElementById("mangaCoverStatus");
  try {
    const covers = await window.loadSupabaseMangaCovers();
    images.forEach(function (image) {
      const localUrl = image.getAttribute("src");
      image.addEventListener("error", function () {
        if (status) {
          status.hidden = false;
          status.textContent = "โหลดรูปจาก Supabase Storage ไม่สำเร็จ กรุณาตรวจสอบไฟล์ใน Bucket manga-covers (แสดงรูปจากเครื่องแทน)";
        }
        image.src = localUrl;
      }, { once: true });
      image.src = covers.get(image.dataset.mangaCover);
    });
  } catch (error) {
    console.error("โหลดภาพปกจาก Supabase ไม่สำเร็จ:", error);
    if (status) {
      status.hidden = false;
      status.textContent = `โหลดภาพปกจาก Supabase ไม่สำเร็จ: ${error.message} (กำลังแสดงรูปจากเครื่องแทน)`;
    }
  }
};

window.addEventListener("DOMContentLoaded", function () {
  window.applySupabaseMangaCovers();
});
