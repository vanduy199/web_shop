const orderContent = document.querySelector(".order__content");
const API_BASE = "http://127.0.0.1:8000/orders/";
const token = localStorage.getItem("access_token");

// 🟢 Helper: Xác định mức ưu tiên của trạng thái để sắp xếp
function statusPriority(s) {
    if (!s) return 1;
    s = String(s).toLowerCase().trim();
    if (["pending", "đang xử lý"].includes(s)) return 0; // Ưu tiên cao nhất
    if (["processing", "delivering", "đang giao"].includes(s)) return 1;
    if (["completed", "hoàn thành", "delivered"].includes(s)) return 2;
    if (["cancelled", "canceled", "đã hủy"].includes(s)) return 3; // Ưu tiên thấp nhất
    return 1;
}

// 🟡 Helper: Màu trạng thái đơn hàng (sử dụng classes của Bootstrap)
function getStatusBadge(status) {
    const lowerStatus = status.toLowerCase();
    switch (lowerStatus) {
        case "đang giao":
        case "đang xử lý":
        case "pending":
            return "bg-warning text-dark";
        case "hoàn thành":
        case "completed":
            return "bg-success";
        case "đã hủy":
        case "cancelled":
            return "bg-danger";
        default:
            return "bg-secondary";
    }
}

// 🚀 Tải và Hiển thị danh sách Đơn hàng
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
        if (!Array.isArray(orders)) orders = orders ? [orders] : [];

        // Sắp xếp đơn hàng
        orders.sort((a, b) => {
            const pa = statusPriority(a.status);
            const pb = statusPriority(b.status);
            if (pa !== pb) return pa - pb;
            const da = a.created_at ? new Date(a.created_at) : 0;
            const db = b.created_at ? new Date(b.created_at) : 0;
            return db - da;
        });

        orderContent.innerHTML = "";
        
        if (orders.length === 0) {
            // HIỂN THỊ: Không có đơn hàng (Sử dụng DIV)
            orderContent.innerHTML = `
                <div style="text-align:center; padding: 30px; border: 1px solid #eee;">
                    Bạn chưa có đơn hàng nào.
                </div>`;
            return;
        }

        let ordersHTML = "";
        // Render từng đơn hàng
        orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleString("vi-VN");
            const total = (order.total_price || 0).toLocaleString("vi-VN") + " đ";
            const status = order.status || "Đang xử lý";

            // CẤU TRÚC SẢN PHẨM TRONG ĐƠN HÀNG
            const itemsHTML = order.items?.map(
                item => `
                    <div class="order__item d-flex align-items-center mb-1">
                        <img src="${item.product_thumb || ''}" style="width: 50px; height: 50px; object-fit: contain; margin-right: 10px;" alt="${item.product_name}"/>
                        <span style="flex-grow: 1;">${item.product_name}</span> 
                        <span class="text-muted" style="white-space: nowrap;">x${item.quantity}</span>
                    </div>
                `
            ).join("") || "<em>Không có sản phẩm</em>";

            // CẤU TRÚC DÒNG ĐƠN HÀNG (Sử dụng DIV và phân bổ width mới)
            ordersHTML += `
               <div class="cart-item order-item-row d-flex align-items-center py-3" data-id="${order.id}">
        
        <div style="width: 10%;" class="order-col-id text-center fw-bold">#${order.id}</div>
        
        <div style="width: 30%;" class="order-col-items">
            ${itemsHTML}
        </div>
        
        <div style="width: 15%;" class="order-col-date text-center">${date}</div>
        
        <div style="width: 15%;" class="order-col-total text-center">
            <span class="fw-bold text-danger">${total}</span>
        </div>
        
        <div style="width: 15%;" class="order-col-status text-center">
            <span class="badge ${getStatusBadge(status)} fs-5 py-3" style="width: 100%; max-width: 100px;">
                ${status}
            </span> 
        </div>
        
        <div style="width: 15%;" class="order-col-action text-center">
            ${status.toLowerCase() === "pending" || status.toLowerCase() === "đang xử lý"
                ? `
                  <button class="buttonDel btn btn-danger py-1" 
                          data-id="${order.id}" 
                          style="font-size: 16px; width: 75px;">
                      Hủy
                  </button>
                              ` 
                            : ``
                        }
                    </div>
                </div>
            `;
        });
        
        orderContent.innerHTML = ordersHTML;

        // GẮN SỰ KIỆN HỦY ĐƠN HÀNG
        attachDeleteListeners();

    } catch (err) {
        console.error("Lỗi load đơn hàng:", err);
        orderContent.innerHTML = `
            <div style="text-align:center; padding: 30px; color:red; border: 1px solid #eee;">
                Lỗi tải đơn hàng. Vui lòng thử lại sau.
            </div>`;
    }
}

// ⚙️ Hàm gắn sự kiện Hủy đơn hàng
function attachDeleteListeners() {
    const buttons = document.querySelectorAll(".buttonDel");

    buttons.forEach(button => {
        button.addEventListener("click", async function () {
            if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) return;
            
            const id = button.getAttribute("data-id");
            
            const res = await fetch(`${API_BASE}${id}`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (res.ok) {
                alert("Hủy đơn hàng thành công!");
                loadOrders(); // Tải lại danh sách sau khi xóa
            } else {
                const err = await res.json().catch(() => ({ detail: "Lỗi không xác định" }));
                alert(`Lỗi: ${err.detail || "Không thể hủy"}`);
            }
        });
    });
}


// 🟢 Gọi khi mở trang
window.addEventListener("DOMContentLoaded", loadOrders);