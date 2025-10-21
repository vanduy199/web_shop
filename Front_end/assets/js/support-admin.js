// support-admin.js (namespaced; khớp backend mới)
(function (global) {
  // ===== Config =====
  const API_BASE = global.APP_API_BASE || "http://127.0.0.1:8000";
  const getToken = () => localStorage.getItem("access_token") || "";

  // ===== UI shell đưa vào #support-root =====
  function renderSupportShell(root) {
    root.innerHTML = `
      <h2 class="h5 mb-3">Hỗ Trợ User</h2>
      <div class="mb-3 d-flex gap-2 align-items-center">
        <select id="filterStatus" class="form-select" style="max-width:220px">
          <option value="">-- Lọc trạng thái --</option>
          <option>New</option><option>Open</option>
          <option>Pending</option><option>Resolved</option><option>Closed</option>
        </select>
        <button class="btn btn-outline-secondary" id="btnReload">Tải lại</button>
        <span id="count" class="text-muted"></span>
      </div>

      <div class="table-responsive">
        <table class="table table-sm table-hover align-middle" id="tblTickets">
          <thead class="table-light">
            <tr>
              <th>#</th>
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

      <!-- Modal chi tiết -->
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

  // ===== Utils =====
  const esc = (s) =>
    String(s ?? "")
      .replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[c]));

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

  // ===== API (khớp backend mới) =====
  // LIST (summary) – không có messages/attachment_urls
  async function fetchTicketsSummary() {
    const status = document.querySelector("#filterStatus")?.value || "";
    const url = new URL(`${API_BASE}/admin/support/tickets`);
    if (status) url.searchParams.set("status_filter", status);
    const res = await fetch(url, { headers: getAuthHeaders(false) });
    if (!res.ok) throw new Error(`GET /tickets ${res.status}`);
    return res.json(); // List[TicketSummary]
  }

  // DETAIL (full) – có messages + attachment_urls
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

        // dropdown status
        const statusSel = document.createElement("select");
        statusSel.className = "form-select form-select-sm";
        ["New", "Open", "Pending", "Resolved", "Closed"].forEach((s) => {
          const op = document.createElement("option");
          op.value = s; op.textContent = s;
          if ((t.status || "") === s) op.selected = true;
          statusSel.appendChild(op);
        });

        // dropdown priority
        const prioSel = document.createElement("select");
        prioSel.className = "form-select form-select-sm";
        ["Low", "Medium", "High", "Urgent"].forEach((p) => {
          const op = document.createElement("option");
          op.value = p; op.textContent = p;
          if ((t.priority || "") === p) op.selected = true;
          prioSel.appendChild(op);
        });

        // actions
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
          <td></td>
          <td></td>
          <td></td>
        `;
        tr.children[4].appendChild(statusSel);
        tr.children[5].appendChild(prioSel);
        tr.children[6].appendChild(btnUpdate);
        tr.children[6].appendChild(btnView);

        tb.appendChild(tr);
      });
    } catch (e) {
      tb.innerHTML = `<tr><td colspan="7" class="text-danger">Lỗi tải danh sách: ${e.message}</td></tr>`;
    }
  }

  // ===== Chi tiết (full) + modal =====
  async function openDetail(id) {
    try {
      const data = await fetchTicketFull(id); // FullTicketDetail
      const d = data.detail || {};
      document.querySelector("#mdTitle").textContent =
        `Ticket #${d.id} — ${d.subject}`;

     // --- trong openDetail(id) sau khi nhận được `data` ---

        document.querySelector("#mdInfo").innerHTML = `
        <div class="row row-cols-2 g-2 align-items-center">
        <div class="text-muted fw-semibold fs-5">Người gửi</div>
        <div class="fs-4">${esc(d.requester_name || "(không tên)")}</div>

        <div class="text-muted fw-semibold fs-5">Email</div>
        <div class="fs-4">${esc(d.requester_email || "-")}</div>

        <div class="text-muted fw-semibold fs-5">SĐT</div>
        <div class="fs-4">${esc(d.requester_phone || "-")}</div>

        <div class="text-muted fw-semibold fs-5">Loại</div>
        <div class="fs-4">${esc(d.issue_type || "-")}</div>

        <div class="text-muted fw-semibold fs-5">Trạng thái</div>
        <div class="fs-4">${esc(d.status || "-")}</div>

        <div class="text-muted fw-semibold fs-5">Ưu tiên</div>
        <div class="fs-4">${esc(d.priority || "-")}</div>

        <div class="text-muted fw-semibold fs-5">Tạo</div>
        <div class="fs-4">${fmtDate(d.created_at)}</div>

        <div class="text-muted fw-semibold fs-5">Cập nhật</div>
        <div class="fs-4">${fmtDate(d.updated_at)}</div>
        </div>
        `;


      const box = document.querySelector("#mdMsgs");
      box.innerHTML = "";

      // Hiển thị messages (nếu backend trả về List[str])
      (data.messages || []).forEach((text) => {
        const div = document.createElement("div");
        div.className = "border rounded p-2 mb-2";
        div.innerHTML = `
          <div>${esc(String(text)).replace(/\n/g, "<br>")}</div>
        `;
        box.appendChild(div);
      });

      // Hiển thị ảnh đính kèm (attachment_urls)
      (data.attachment_urls || []).forEach((url) => {
        const div = document.createElement("div");
        div.className = "mt-2";
        div.innerHTML = `
          <a href="${esc(url)}" target="_blank">
            <img src="${esc(url)}" class="support-attachment" alt="attachment">
          </a>
        `;
        box.appendChild(div);
      });

      const modalEl = document.getElementById("ticketModal");
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
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
