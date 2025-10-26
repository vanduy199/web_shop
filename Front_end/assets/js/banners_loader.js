const API_BASE = "http://127.0.0.1:8000"; // sửa nếu backend chạy trên host khác

function resolveImageUrl(u) {
  if (!u) return "./assets/img/placeholder.png";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  // relative path from backend (e.g. /static/...) -> prefix backend origin
  return `${API_BASE}${u}`;
}

async function loadBannersForPosition(pos, imgId, linkId) {
  try {
    const res = await fetch(`${API_BASE}/banners/?banner_position=${encodeURIComponent(pos)}`);
    if (!res.ok) return;
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return;
    const b = arr[0]; // lấy banner đầu tiên cho vị trí
    const imgEl = document.getElementById(imgId);
    const linkEl = document.getElementById(linkId);
    if (imgEl) imgEl.src = resolveImageUrl(b.image_url);
    if (linkEl && b.link) linkEl.href = b.link;
  } catch (err) {
    console.warn("loadBannersForPosition error", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadBannersForPosition("homepage_top", "banner-top-img", "banner-top-link");
  loadBannersForPosition("homepage_mid_left", "banner-mid-left-img", "banner-mid-left-link");
  loadBannersForPosition("homepage_mid_center", "banner-mid-center-img", "banner-mid-center-link");
  loadBannersForPosition("homepage_mid_right", "banner-mid-right-img", "banner-mid-right-link");
});