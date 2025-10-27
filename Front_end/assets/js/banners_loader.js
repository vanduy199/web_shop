const API_BASE = "http://127.0.0.1:8000"; // chỉnh nếu backend khác

function resolveImageUrl(u){
  if(!u) return "./assets/img/placeholder.png";
  try {
    u = String(u).trim();
  } catch { return "./assets/img/placeholder.png"; }

  // already absolute
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  // leading slash => backend relative from host
  if (u.startsWith("/")) return `${API_BASE}${u}`;
  // common case "static/..." or "static/banners/..."
  if (u.startsWith("static/")) return `${API_BASE}/${u}`;
  // just filename -> assume in /static/banners/
  if (/^[\w\-.]+(\.(jpg|jpeg|png|webp|gif))$/i.test(u)) return `${API_BASE}/static/banners/${u}`;
  // fallback: return as-is
  return u;
}

function pickBanner(arr){
  if(!Array.isArray(arr) || arr.length === 0) return null;
  const active = arr.find(b => b.active === true || b.is_active === true);
  return active || arr[0];
}

async function loadBanners(){
  const map = [
    { pos: "homepage_top", imgId: "banner-top-img", linkId: "banner-top-link" },
    { pos: "homepage_mid_left", imgId: "banner-mid-left-img", linkId: "banner-mid-left-link" },
    { pos: "homepage_mid_center", imgId: "banner-mid-center-img", linkId: "banner-mid-center-link" },
    { pos: "homepage_mid_right", imgId: "banner-mid-right-img", linkId: "banner-mid-right-link" }
  ];

  for(const m of map){
    try{
      const url = `${API_BASE}/banners/?banner_position=${encodeURIComponent(m.pos)}`;
      const res = await fetch(url);
      if(!res.ok){
        console.warn("banner API error", m.pos, res.status, await res.text());
        continue;
      }
      const arr = await res.json();
      console.debug("banners for", m.pos, arr);
      const b = pickBanner(arr);
      if(!b) continue;

      const imgEl = document.getElementById(m.imgId);
      const linkEl = document.getElementById(m.linkId);

      const imageField = b.image_url || b.image || b.img || b.imageUrl || "";
      const finalImg = resolveImageUrl(imageField);

      if(imgEl){
        imgEl.src = finalImg;
        imgEl.alt = b.title || b.name || m.pos;
        imgEl.loading = "lazy";
      }

      const href = b.link || b.target || b.url || b.link_url || null;
      if(linkEl){
        if(href){
          // if href is relative and starts with '/', don't prefix
          if(href.startsWith("http://") || href.startsWith("https://")) {
            linkEl.href = href;
            linkEl.target = "_blank";
            linkEl.rel = "noopener noreferrer";
          } else {
            linkEl.href = href;
            linkEl.removeAttribute("target");
            linkEl.removeAttribute("rel");
          }
        } else {
          linkEl.removeAttribute("href");
        }
      }
    }catch(e){
      console.error("loadBanners error for", m.pos, e);
    }
  }
}

document.addEventListener("DOMContentLoaded", loadBanners);