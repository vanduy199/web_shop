// support-admin.js (namespaced; fixed to always render images reliably)
(function (global) {
  // ===== Config =====
  const API_BASE = global.APP_API_BASE || "http://127.0.0.1:8000";
  const getToken = () => localStorage.getItem("access_token") || "";

  // ===== Utils =====
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[c]));
  const fmtDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString("vi-VN");
  };
  function getAuthHeaders(withJson = false) {
    const h = {};
    if (withJson) h["Content-Type"] = "application/json";
    const t = getToken();
    if (t) h["Authorization"] = `Bearer ${t}`;
    return h;
  }
  // NEW: chuẩn hoá URL ảnh
  function absUrl(url) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    return API_BASE.replace(/\/$/, "") + "/" + String(url).replace(/^\//, "");
  }

  // ===== UI shell đưa vào #support-root =====
  function renderSupportShell(root) {
    root.innerHTML = `
      <div class="border p-3 rounded bg-white shadow-sm">
        <h2 class="mb-3">DANH SÁCH YÊU CẦU HỖ TRỢ</h2>

        <div class="mb-3 d-flex gap-2 align-items-center flex-wrap">
          <select id="filterStatus" class="form-select" style="max-width:220px">
            <option value="">-- Lọc trạng thái --</option>
            <option>New</option><option>Open</option>
            <option>Pending</option><option>Resolved</option><option>Closed</option>
          </select>
          <button class="btn btn-danger" id="btnReload">
            <!-- Nếu không dùng bootstrap-icons, có thể bỏ <i> này -->
            <i class="bi bi-arrow-clockwise me-1"></i>Tải lại
          </button>
          <span id="count" class="ms-2 text-muted small"></span>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle" id="tblTickets">
            <thead>
              <tr>
                <th>Ticket_id</th>
                <th>Ngày tạo</th>
                <th>Người gửi</th>
                <th>Email</th>
                <th>Trạng thái</th>
                <th>Ưu tiên</th>
                <th style="width:180px">Thao tác</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>

      <!-- Modal chi tiết (PHẢI có để nút Xem hoạt động) -->
      <div class="modal fade" id="ticketModal" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 id="mdTitle" class="modal-title">Ticket</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div id="mdInfo" class="row g-2 mb-3"></div>
              <div class="col-3 text-muted fw-semibold fs-5">Nội dung</div>
              <div id="mdMsgs"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ===== API (khớp backend mới) =====
  async function fetchTicketsSummary() {
    const status = document.querySelector("#filterStatus")?.value || "";
    const url = new URL(`${API_BASE}/admin/support/tickets`);
    if (status) url.searchParams.set("status_filter", status);
    const res = await fetch(url, { headers: getAuthHeaders(false) });
    if (!res.ok) throw new Error(`GET /tickets ${res.status}`);
    return res.json(); // List[TicketSummary]
  }
  async function fetchTicketFull(id) {
    const res = await fetch(`${API_BASE}/admin/support/tickets/${id}`, {
      headers: getAuthHeaders(false),
    });
    if (!res.ok) throw new Error(`GET /tickets/${id} ${res.status}`);
    return res.json(); // FullTicketDetail
  }
  async function patchStatus(id, body) {
    const res = await fetch(`${API_BASE}/admin/support/tickets/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(true),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = `PATCH /tickets/${id}/status ${res.status}`;
      try { const j = await res.json(); msg += ` - ${j.detail || JSON.stringify(j)}`; } catch {}
      throw new Error(msg);
    }
    return res.json();
  }

  // ===== Render list (summary) =====
  async function loadTickets() {
    const tb = document.querySelector("#tblTickets tbody");
    if (!tb) return;
    tb.innerHTML = `<tr><td colspan="7">Đang tải...</td></tr>`;

    try {
      const data = await fetchTicketsSummary(); // List[TicketSummary]
      document.querySelector("#count").textContent = `${data.length} ticket`;
      tb.innerHTML = "";

      data.forEach((t) => {
        const tr = document.createElement("tr");

        const statusSel = document.createElement("select");
        statusSel.className = "form-select form-select-sm";
        ["New", "Open", "Pending", "Resolved", "Closed"].forEach((s) => {
          const op = document.createElement("option");
          op.value = s; op.textContent = s;
          if ((t.status || "") === s) op.selected = true;
          statusSel.appendChild(op);
        });

        const prioSel = document.createElement("select");
        prioSel.className = "form-select form-select-sm";
        ["Low", "Medium", "High", "Urgent"].forEach((p) => {
          const op = document.createElement("option");
          op.value = p; op.textContent = p;
          if ((t.priority || "") === p) op.selected = true;
          prioSel.appendChild(op);
        });

        const btnUpdate = document.createElement("button");
        btnUpdate.className = "btn btn-sm btn-danger me-2";
        btnUpdate.textContent = "Cập nhật";
        btnUpdate.onclick = async () => {
          try {
            await patchStatus(t.id, { status: statusSel.value, priority: prioSel.value });
            await loadTickets();
          } catch (e) { alert(e.message); }
        };

        const btnView = document.createElement("button");
        btnView.className = "btn btn-sm btn-outline-secondary";
        btnView.textContent = "Xem";
        btnView.onclick = () => openDetail(t.id);

        tr.innerHTML = `
          <td>#${esc(t.id)}</td>
          <td>${fmtDate(t.created_at)}</td>
          <td>${esc(t.requester_name)}</td>
          <td>${esc(t.requester_email)}</td>
          <td></td><td></td><td></td>
        `;
        tr.children[4].appendChild(statusSel);
        tr.children[5].appendChild(prioSel);
        tr.children[6].appendChild(btnUpdate);
        tr.children[6].appendChild(btnView);

        tb.appendChild(tr);
      });
    } catch (e) {
      tb.innerHTML = `<tr><td colspan="7" class="text-danger">Lỗi tải danh sách: ${esc(e.message)}</td></tr>`;
    }
  }

  // ===== Hiển thị ảnh (blob) để luôn gửi header Auth =====
  function makeImageRenderer() {
    const urls = new Set(); // lưu objectURL để thu dọn
    function revokeAll() {
      urls.forEach((u) => { URL.revokeObjectURL(u); });
      urls.clear();
    }
    async function renderInto(container, url) {
      const full = absUrl(url);
      try {
        const res = await fetch(full, { headers: getAuthHeaders(false) });
        if (!res.ok) throw new Error(`GET image ${res.status}`);
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        urls.add(objUrl);

        const a = document.createElement("a");
        a.href = objUrl; a.target = "_blank"; a.rel = "noopener";
        const img = document.createElement("img");
        img.src = objUrl; img.alt = "attachment"; img.className = "support-attachment";
        img.style.maxWidth = "220px"; img.style.borderRadius = "8px"; img.style.border = "1px solid #eee";
        a.appendChild(img);
        container.appendChild(a);
      } catch (e) {
        container.insertAdjacentHTML("beforeend",
          `<div class="text-danger">Không tải được ảnh: ${esc(e.message)}</div>`);
      }
    }
    return { renderInto, revokeAll };
  }

  // ===== Chi tiết (full) + modal =====
  async function openDetail(id) {
  // Lấy modal trong DOM
  let modalEl = document.getElementById("ticketModal");
  if (!modalEl) { alert("Không tìm thấy #ticketModal"); return; }

  // Di chuyển modal ra body 1 lần để tránh bị clip/overflow
  if (!modalEl.dataset.movedToBody) {
    document.body.appendChild(modalEl);
    modalEl.dataset.movedToBody = "1";
  }

  const imgRenderer = makeImageRenderer();

  // Thu dọn blob khi đóng modal
  if (window.bootstrap?.Modal) {
    modalEl.addEventListener("hidden.bs.modal", imgRenderer.revokeAll, { once: true });
  } else {
    modalEl.querySelector(".btn-close")?.addEventListener("click", imgRenderer.revokeAll, { once: true });
  }

  try {
    const data = await fetchTicketFull(id);
    const d = data.detail || {};

    // ⚠️ Scope theo modalEl để tránh đụng ID trùng ở chỗ khác
    modalEl.querySelector("#mdTitle").textContent =
      `Ticket #${d.id} — ${d.subject || ""}`;

    modalEl.querySelector("#mdInfo").innerHTML = `
      <div class="row row-cols-2 g-2 align-items-center">
        <div class="text-muted fw-semibold fs-5">Người gửi</div><div class="fs-4">${esc(d.requester_name || "(không tên)")}</div>
        <div class="text-muted fw-semibold fs-5">Email</div><div class="fs-4">${esc(d.requester_email || "-")}</div>
        <div class="text-muted fw-semibold fs-5">SĐT</div><div class="fs-4">${esc(d.requester_phone || "-")}</div>
        <div class="text-muted fw-semibold fs-5">Loại</div><div class="fs-4">${esc(d.issue_type || "-")}</div>
        <div class="text-muted fw-semibold fs-5">Trạng thái</div><div class="fs-4">${esc(d.status || "-")}</div>
        <div class="text-muted fw-semibold fs-5">Ưu tiên</div><div class="fs-4">${esc(d.priority || "-")}</div>
        <div class="text-muted fw-semibold fs-5">Tạo</div><div class="fs-4">${fmtDate(d.created_at)}</div>
        <div class="text-muted fw-semibold fs-5">Cập nhật</div><div class="fs-4">${fmtDate(d.updated_at)}</div>
      </div>
    `;

    const box = modalEl.querySelector("#mdMsgs");
    box.innerHTML = "";

    // Messages
    (data.messages || []).forEach((text) => {
      const div = document.createElement("div");
      div.className = "border rounded p-2 mb-2";
      div.innerHTML = `<div>${esc(String(text)).replace(/\n/g, "<br>")}</div>`;
      box.appendChild(div);
    });

    // Attachments (blob để gửi Bearer)
    (data.attachment_urls || []).forEach((url) => {
      const div = document.createElement("div");
      div.className = "mt-2";
      box.appendChild(div);
      // render ảnh vào div
      makeImageRenderer().renderInto(div, url);
    });

    // Hiển thị modal
    if (window.bootstrap?.Modal) {
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
    } else {
      modalEl.style.display = "block";
    }
  } catch (e) {
    alert("Lỗi lấy chi tiết: " + e.message);
  }
}

  // ===== Init khi mở pane hỗ trợ =====
  function initSupportAdmin() {
    const root = document.querySelector("#support-root");
    if (!root) return;
    renderSupportShell(root);
    document.querySelector("#btnReload").onclick = loadTickets;
    document.querySelector("#filterStatus").onchange = loadTickets;
    loadTickets();
  }

  // Tránh bind lặp
  if (!global.__SUPPORT_ADMIN_BOUND__) {
    global.__SUPPORT_ADMIN_BOUND__ = true;

    // Nhận tín hiệu từ admin.js (khi tab hỗ trợ được kích hoạt)
    window.addEventListener("pane:activated", (e) => {
      if (e.detail?.id === "support-pane") {
        if (!document.getElementById("tblTickets")) initSupportAdmin();
        else loadTickets();
      }
    });

    // Fallback nếu chưa có handler riêng
    document.addEventListener("click", (ev) => {
      const li = ev.target.closest('.nav__item[data-target="support-pane"]');
      if (!li) return;
      document.querySelectorAll(".item-pane").forEach((p) => p.classList.remove("active"));
      document.getElementById("support-pane")?.classList.add("active");
      if (!document.getElementById("tblTickets")) initSupportAdmin();
      window.dispatchEvent(new CustomEvent("pane:activated", { detail: { id: "support-pane" } }));
    });

    // Nếu pane đã active sẵn khi load
    if (document.getElementById("support-pane")?.classList.contains("active")) {
      initSupportAdmin();
    }
  }
})(window);
