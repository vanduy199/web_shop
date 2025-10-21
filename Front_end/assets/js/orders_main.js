// ==================== CẤU HÌNH ====================
const tbody = document.querySelector(".orders-management__content");
const API_BASE = "http://127.0.0.1:8000/orders/all";
// ==================== LOAD DANH SÁCH ĐƠN HÀNG ====================
async function loadAllOrders() {
    try {
        const res = await fetch(API_BASE, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) throw new Error("Không thể tải danh sách đơn hàng");
        const orders = await res.json();
        console.log(orders);
        renderOrders(orders);

    } catch (err) {
        console.error("Lỗi tải đơn hàng:", err);
        tbody.innerHTML = `
            <tr><td colspan="7" style="text-align:center;color:red;">
                Không thể tải đơn hàng. Vui lòng thử lại.
            </td></tr>`;
    }
}

// ==================== HIỂN THỊ ĐƠN HÀNG ====================
function renderOrders(orders) {
    tbody.innerHTML = "";

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="7" style="text-align:center;">Không có đơn hàng nào</td></tr>`;
        return;
    }

    orders.forEach(order => {
        const date = new Date(order.created_at).toLocaleString("vi-VN");
        const total = (order.total_price || 0).toLocaleString("vi-VN") + " đ";
        const status = order.status || "Đang xử lý";

        const itemsHTML = order.items?.map(item => `
            <div class="order__item d-flex align-items-center mb-1">
                <img src="${item.product_thumb || ''}" width="40" height="40" style="border-radius:5px;margin-right:6px;">
                <span>${item.product_name}</span> 
                <small class="text-muted ms-1">x${item.quantity}</small>
            </div>
        `).join("") || "<em>Không có sản phẩm</em>";

        tbody.innerHTML += `
            <tr data-id="${order.id}">
                <td>#${order.id}</td>
                <td>${date}</td>
                <td>${order.user_id}</td>
                <td>
                    <select class="form-select form-select-sm order-status" data-id="${order.id}">
                        ${getStatusOptions(status)}
                    </select>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary update-status-btn" data-id="${order.id}">
                        Cập nhật
                    </button>
                </td>
                <td>${order.payment_method}</td>
                <td>${order.shipping_address}</td>
                <td>${total}</td>
                <td>${date}</td>
            </tr>`;
    });

    // Gán sự kiện click cho nút cập nhật trạng thái
    document.querySelectorAll(".update-status-btn").forEach(btn => {
        btn.addEventListener("click", updateOrderStatus);
    });
}

// ==================== CẬP NHẬT TRẠNG THÁI ====================
async function updateOrderStatus(e) {
    const orderId = e.target.dataset.id;
    const statusSelect = document.querySelector(`.order-status[data-id="${orderId}"]`);
    const newStatus = statusSelect.value;

    if (!confirm(`Xác nhận cập nhật trạng thái đơn #${orderId} thành "${newStatus}"?`))
        return;

    try {
        const res = await fetch(`${API_BASE}/${orderId}/status?status=${encodeURIComponent(newStatus)}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) throw new Error("Cập nhật thất bại");
        const data = await res.json();

        alert(`✅ ${data.message}`);
        loadAllOrders(); // reload lại danh sách

    } catch (err) {
        console.error("Lỗi cập nhật trạng thái:", err);
        alert("❌ Lỗi khi cập nhật trạng thái đơn hàng");
    }
}

// ==================== HÀM HỖ TRỢ ====================
function getStatusOptions(current) {
    const statuses = ["Đang xử lý", "Đang giao", "Hoàn thành", "Đã hủy"];
    return statuses.map(s =>
        `<option value="${s}" ${s === current ? "selected" : ""}>${s}</option>`
    ).join("");
}

// ==================== CHẠY KHI LOAD TRANG ====================
window.addEventListener("DOMContentLoaded", loadAllOrders);
