const API_BASE_URL = "http://127.0.0.1:8000";
let bannersList = [];
let currentSlotPos = null;
let selectedBannerId = null;

function getAuthHeader() {
  const token = localStorage.getItem("access_token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

// --- add resolveImageUrl so src always points to a valid URL ---
function resolveImageUrl(u){
  if(!u) return "../assets/img/placeholder.png";
  if(u.startsWith("http://") || u.startsWith("https://")) return u;
  if(u.startsWith("/")) return `${API_BASE_URL}${u}`;
  return `${API_BASE_URL}/${u}`;
}

// load all banners and render 4 slots
async function loadAllSlots() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/banners/`, { headers: getAuthHeader() });
    if (!res.ok) {
      console.warn("Không thể lấy banners:", res.status);
      bannersList = [];
    } else {
      bannersList = await res.json();
    }
  } catch (err) {
    console.error(err);
    bannersList = [];
  }

  // helper to find banner by position
  const findByPos = (pos) => bannersList.find(b => b.position === pos);

  const map = {
    "homepage_top": "slot-top-img",
    "homepage_mid_left": "slot-left-img",
    "homepage_mid_center": "slot-mid-img",
    "homepage_mid_right": "slot-right-img"
  };

  Object.entries(map).forEach(([pos, imgId]) => {
    const el = document.getElementById(imgId);
    const info = document.getElementById(`slot-${pos}-info`);
    const b = findByPos(pos);
    if (el) {
      if (b && (b.image_url || b.image)) {
        el.src = resolveImageUrl(b.image_url || b.image);
        el.alt = b.title || pos;
        if (info) info.textContent = `ID:${b.id} ${b.title || ""}`;
      } else {
        el.src = "../assets/img/placeholder.png";
        el.alt = pos;
        if (info) info.textContent = "Chưa gán";
      }
      // store banner id on image for quick access
      el.dataset.bannerId = b ? b.id : "";
    }
  });
}

// open selection panel for a slot
function openSelectionPanel(position) {
  currentSlotPos = position;
  selectedBannerId = null;
  document.getElementById("banner-selection-panel").style.display = "block";
  document.getElementById("selection-panel-title").textContent = `Chọn ảnh cho vị trí: ${position}`;
  renderSelectionThumbs();
}

// render thumbnails of existing banners
function renderSelectionThumbs() {
  const container = document.getElementById("selection-thumbs");
  container.innerHTML = "";
  if (!Array.isArray(bannersList) || bannersList.length === 0) {
    container.innerHTML = `<div class="text-muted">Chưa có ảnh trong hệ thống</div>`;
    return;
  }
  bannersList.forEach(b => {
    const div = document.createElement("div");
    div.className = "thumb-item";
    div.style.cursor = "pointer";
    div.style.border = "1px solid #ddd";
    div.style.padding = "4px";
    div.style.width = "110px";
    div.style.textAlign = "center";
    const imgSrc = resolveImageUrl(b.image_url || b.image);
    div.innerHTML = `<img src="${imgSrc}" alt="" style="width:100px;height:60px;object-fit:cover;display:block;margin:0 auto 4px;"><div class="small text-truncate">${b.title||('ID:'+b.id)}</div>`;
    div.addEventListener('click', () => {
      // highlight selection
      Array.from(container.children).forEach(c => c.style.boxShadow = "");
      div.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.25)";
      selectedBannerId = b.id;
    });
    container.appendChild(div);
  });
}

// apply selected existing banner to current slot (update its position)
async function applySelection() {
  if (!currentSlotPos) return alert("Vị trí chưa chọn");
  if (!selectedBannerId) return alert("Vui lòng chọn ảnh hiện có hoặc upload ảnh mới");
  try {
    const res = await fetch(`${API_BASE_URL}/admin/banners/${selectedBannerId}`, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, getAuthHeader()),
      body: JSON.stringify({ position: currentSlotPos })
    });
    if (!res.ok) {
      const e = await res.json().catch(()=>({detail:"Unknown"}));
      throw new Error(e.detail || "Không thể gán banner");
    }
    await loadAllSlots();
    closeSelectionPanel();
    alert("Gán ảnh thành công");
  } catch (err) {
    console.error(err);
    alert("Lỗi: " + (err.message || ""));
  }
}

// upload new file and assign to slot
async function uploadAndApply() {
  if (!currentSlotPos) return alert("Vị trí chưa chọn");
  const fileInput = document.getElementById("selection-upload");
  const file = fileInput.files && fileInput.files[0];
  if (!file) return alert("Chưa chọn file upload");
  const fd = new FormData();
  fd.append("title", file.name);
  fd.append("position", currentSlotPos);
  fd.append("active", "1");
  fd.append("file", file);
  try {
    const res = await fetch(`${API_BASE_URL}/admin/banners/`, {
      method: "POST",
      headers: getAuthHeader(), // do not set Content-Type
      body: fd
    });
    if (!res.ok) {
      const e = await res.json().catch(()=>({detail:"Unknown"}));
      throw new Error(e.detail || "Upload thất bại");
    }
    await loadAllSlots();
    closeSelectionPanel();
    alert("Upload và gán thành công");
  } catch (err) {
    console.error(err);
    alert("Lỗi upload: " + (err.message || ""));
  }
}

// clear (delete) banner assigned to slot
async function clearSlot(position) {
  // find banner currently set to position
  const b = bannersList.find(x => x.position === position);
  if (!b) return alert("Không có banner để bỏ gán ở vị trí này");

  if (!confirm(`Bạn có chắc muốn bỏ gán ảnh ID ${b.id} khỏi vị trí ${position}?`)) return;
  try {
    // dùng PUT để cập nhật position => null (bỏ gán) thay vì DELETE
    const res = await fetch(`${API_BASE_URL}/admin/banners/${b.id}`, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, getAuthHeader()),
      body: JSON.stringify({ position: null })
    });
    if (!res.ok) {
      const e = await res.json().catch(()=>({detail:"Unknown"}));
      throw new Error(e.detail || "Bỏ gán thất bại");
    }
    await loadAllSlots();
    alert("Đã bỏ gán ảnh khỏi vị trí");
  } catch (err) {
    console.error(err);
    alert("Lỗi: " + (err.message || ""));
  }
}

function closeSelectionPanel() {
  document.getElementById("banner-selection-panel").style.display = "none";
  currentSlotPos = null;
  selectedBannerId = null;
  const upload = document.getElementById("selection-upload");
  if (upload) upload.value = "";
}

// wire events on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  loadAllSlots();

  // bind select buttons
  document.querySelectorAll(".btn-select-slot").forEach(btn => {
    btn.addEventListener("click", (e) => {
      openSelectionPanel(btn.dataset.pos);
    });
  });

  // bind clear buttons
  document.querySelectorAll(".btn-clear-slot").forEach(btn => {
    btn.addEventListener("click", (e) => {
      clearSlot(btn.dataset.pos);
    });
  });

  // selection panel controls (guard if elements exist)
  const applyBtn = document.getElementById("selection-apply");
  if (applyBtn) applyBtn.addEventListener("click", applySelection);
  const uploadApplyBtn = document.getElementById("selection-upload-and-apply");
  if (uploadApplyBtn) uploadApplyBtn.addEventListener("click", uploadAndApply);
  const cancelBtn = document.getElementById("selection-cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", closeSelectionPanel);
});