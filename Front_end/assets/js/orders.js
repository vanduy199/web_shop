const tbody = document.querySelector(".order__content");
const API_BASE = "http://127.0.0.1:8000/orders/";
const token = localStorage.getItem("access_token");

function statusPriority(s) {
    if (!s) return 1;
    s = String(s).toLowerCase().trim();
    if (["pending", "đang xử lý"].includes(s)) return 0;
    if (["processing", "delivering", "đang giao"].includes(s)) return 1;
    if (["completed", "hoàn thành", "delivered"].includes(s)) return 2;
    if (["cancelled", "canceled", "đã hủy"].includes(s)) return 3;
    return 1;
}

async function loadOrders() {
    try {
        const res = await fetch(API_BASE,
            {
                method: 'GET',
                headers: {
                    "Authorization": `Bearer ${token}` 
                }
            }
        );
        if (!res.ok) throw new Error("Không thể tải đơn hàng từ server");

        let orders = await res.json();
        console.log(orders)
        if (!Array.isArray(orders)) orders = orders ? [orders] : [];

        // sort: pending/processing first, completed/cancelled last; within same priority sort by created_at desc
        orders.sort((a, b) => {
            const pa = statusPriority(a.status);
            const pb = statusPriority(b.status);
            if (pa !== pb) return pa - pb;
            const da = a.created_at ? new Date(a.created_at) : 0;
            const db = b.created_at ? new Date(b.created_at) : 0;
            return db - da;
        });

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
            if (status == "pending") {
                tbody.innerHTML += `
                <tr data-id="${order.id}">
                    <td>#${order.id}</td>
                    <td>${itemsHTML}</td>
                    <td>${date}</td>
                    <td>${total}</td>
                    <td>
                        <span class="badge ${getStatusBadge(status)}">${status}</span>
                    </td>
                    <td>
                        <button class="buttonDel" data-id="${order.id}">XÓA</button>
                    </td>
                </tr>`;
            }
            else {
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
            }

            
            const buttons = document.getElementsByClassName("buttonDel");

            Array.from(buttons).forEach(button => {
                button.onclick = async function () {
                const id = button.getAttribute("data-id");

                const res = await fetch(`${API_BASE}${id}`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
                });

                if (res.ok) {
                    alert("Xóa thành công!");
                    loadOrders();
                } else {
                const err = await res.json();
                alert(`Lỗi: ${err.detail || "Không thể xóa"}`);
                }
            };
    });
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
