const tbody = document.querySelector(".order__content");
const API_BASE = "http://127.0.0.1:8000/orders";
const userId = 1; // sau này có thể lấy từ localStorage sau khi login

// 🧩 Hàm load danh sách đơn hàng
async function loadOrders() {
    try {
        const res = await fetch(`${API_BASE}/${userId}`);
        if (!res.ok) throw new Error("Không thể tải đơn hàng từ server");

        let orders = await res.json();
        if (!Array.isArray(orders)) orders = orders ? [orders] : [];

        tbody.innerHTML = "";
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">Bạn chưa có đơn hàng nào</td>
                </tr>`;
            return;
        }

        // render từng đơn hàng
        orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleString("vi-VN");
            const total = (order.total_price || 0).toLocaleString("vi-VN") + " đ";
            const status = order.status || "Đang xử lý";

            // Nếu có danh sách sản phẩm trong order.items
            const itemsHTML = order.items?.map(
                item => `
                    <div class="order__item">
                        <img src="${item.product_thumb || ''}" width="40" height="40" />
                        <span>${item.product_name}</span> 
                        <span class="text-muted">x${item.quantity}</span>
                    </div>
                `
            ).join("") || "<em>Không có sản phẩm</em>";

            tbody.innerHTML += `
                <tr data-id="${order.id}">
                    <td>#${order.id}</td>
                    <td>${itemsHTML}</td>
                    <td>${date}</td>
                    <td>${total}</td>
                    <td>
                        <span class="badge ${getStatusBadge(status)}">${status}</span>
                    </td>
                </tr>`;
        });

    } catch (err) {
        console.error("Lỗi load đơn hàng:", err);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; color:red;">
                    Lỗi tải đơn hàng. Vui lòng thử lại sau.
                </td>
            </tr>`;
    }
}

// 🟡 Helper: màu trạng thái đơn hàng
function getStatusBadge(status) {
    switch (status.toLowerCase()) {
        case "đang giao":
        case "đang xử lý":
            return "bg-warning text-dark";
        case "hoàn thành":
            return "bg-success";
        case "đã hủy":
            return "bg-danger";
        default:
            return "bg-secondary";
    }
}

// 🟢 Gọi khi mở trang
window.addEventListener("DOMContentLoaded", loadOrders);
