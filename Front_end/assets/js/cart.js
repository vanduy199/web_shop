const table = document.querySelector("table");
const tbody = document.querySelector("table tbody"); 
const totalPrice = document.querySelector(".total-price");

const API_BASE = "http://127.0.0.1:8000/cart";

// 🟢 Lấy token từ localStorage
const token = localStorage.getItem("access_token"); // DÙNG access_token

// 🟢 Headers cho tất cả request
const headers = token
  ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
  : { "Content-Type": "application/json" };

// 🟢 Không cần userId cố định — backend lấy từ token
const userId = null;

// Load giỏ hàng
async function loadCart() {
    try {
        // 🔧 Sửa: bỏ userId ra khỏi URL + thêm headers
        const res = await fetch(`${API_BASE}/`, { headers });
        if (!res.ok) throw new Error("Không load được giỏ hàng");
        let carts = await res.json();

        if (!Array.isArray(carts)) {
            carts = carts ? [carts] : [];
        }

        const selectedBefore = Array.from(
            document.querySelectorAll(".select-item:checked")
        ).map(cb => cb.dataset.id);

        tbody.innerHTML = "";
        if (carts.length === 0) {
            totalPrice.textContent = "Giỏ hàng trống";
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">Không có sản phẩm nào</td>
                </tr>`;
            return;
        }

        let index = 1;
        carts.forEach(item => {
            const isChecked = selectedBefore.includes(item.id.toString());
            tbody.innerHTML += `
                <tr data-id="${item.id}">
                    <td>
                        <input type="checkbox" class="select-item"
                            data-id="${item.id}" ${isChecked ? "checked" : ""}>
                        <span>${index++}</span>
                    </td>
                    <td class="cart__info-product">
                        <img src="${item.product?.thumb || ''}" style="width:60px;"/>
                        <span class="cart__info-name">${item.product?.name || "N/A"}</span>
                    </td>
                    <td>
                        <span class="cart__info-price" id="price-${item.id}">
                            ${(item.product?.price || 0).toLocaleString("vi-VN")} đ
                        </span>
                    </td>
                    <td>
                        <div class="control-quantity">
                            <button class="btn btn-success btn-decrease" data-id="${item.id}">-</button>
                            <span id="qty-${item.id}">${item.quantity}</span>
                            <button class="btn btn-success btn-increase" data-id="${item.id}">+</button>
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-danger btn-remove" data-id="${item.id}">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        // Gắn lại sự kiện
        document.querySelectorAll(".select-item").forEach(cb => {
            cb.addEventListener("change", updateTotal);
        });
        document.querySelectorAll(".btn-increase").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                const qty = parseInt(document.getElementById(`qty-${id}`).textContent, 10);
                increase(id, qty);
            });
        });
        document.querySelectorAll(".btn-decrease").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                const qty = parseInt(document.getElementById(`qty-${id}`).textContent, 10);
                decrease(id, qty);
            });
        });
        document.querySelectorAll(".btn-remove").forEach(btn => {
            btn.addEventListener("click", () => {
                removeItem(btn.dataset.id);
            });
        });

        updateTotal();
    } catch (err) {
        console.error(err);
    }
}

// giữ controller ở scope ngoài để có thể abort request trước đó
let lastCalcController = null;

// Tính tổng tiền
async function updateTotal() {
    const selectedCheckboxes = Array.from(document.querySelectorAll(".select-item:checked"));
    const selected = selectedCheckboxes.map(cb => cb.dataset.id);

    if (selected.length === 0) {
        totalPrice.textContent = "Tổng thanh toán: 0 đ";
        return;
    }

    if (lastCalcController) {
        try { lastCalcController.abort(); } catch (e) { /* ignore */ }
    }
    lastCalcController = new AbortController();
    const signal = lastCalcController.signal;

    const requestedKey = selected.join(',');

    try {
        const params = selected.map(id => `selected_ids=${encodeURIComponent(id)}`).join("&");
        // 🔧 Sửa: bỏ userId, thêm headers
        const url = `${API_BASE}/calculate-total?${params}`;
        const res = await fetch(url, { signal, headers });

        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`API lỗi ${res.status} ${errText}`);
        }

        const data = await res.json();

        const currentKey = Array.from(document.querySelectorAll(".select-item:checked")).map(cb => cb.dataset.id).join(',');
        if (currentKey !== requestedKey) return;

        const total = Number(data.total_price) || 0;
        totalPrice.textContent = "Tổng thanh toán: " + total.toLocaleString("vi-VN") + " đ";
    } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Lỗi tính tổng:", err);

        let total = 0;
        selected.forEach(id => {
            const row = document.querySelector(`tr[data-id="${id}"]`);
            if (!row) return;
            const priceText = row.querySelector(".cart__info-price")?.textContent || "0";
            const price = parseInt(priceText.replace(/[^\d]/g, ""), 10) || 0;
            const qtyText = row.querySelector(`#qty-${id}`)?.textContent || "0";
            const qty = parseInt(qtyText.replace(/[^\d]/g, ""), 10) || 0;
            total += price * qty;
        });

        totalPrice.textContent = "Tổng thanh toán: " + total.toLocaleString("vi-VN") + " đ";
    }
}

// 🟢 Thêm sản phẩm vào giỏ (POST /cart)
async function addToCart(productId, quantity = 1) {
    try {
        console.log("Thêm vào giỏ:", productId, quantity);

        const res = await fetch(`${API_BASE}/`, {
            method: "POST",
            headers: headers, // 🟢 dùng chung headers có Bearer token
            body: JSON.stringify({
                product_id: Number(productId),
                quantity: Number(quantity)
            }),
        });

        let data = null;
        try { data = await res.json(); } catch (e) { /* không phải json */ }

        if (!res.ok) {
            console.error("Thêm thất bại:", res.status, data);
            alert("Thêm vào giỏ thất bại: " + (data?.detail || res.status));
            return;
        }

        console.log("Thêm thành công:", data);
        await loadCart();
        alert("Đã thêm vào giỏ hàng!");
    } catch (err) {
        console.error("Lỗi khi thêm sản phẩm:", err);
        alert("Lỗi mạng hoặc server. Kiểm tra console.");
    }
}

// API gọi khi tăng/giảm
async function increase(cartId, qty) { await updateQuantity(cartId, qty + 1); }
async function decrease(cartId, qty) { if (qty > 1) await updateQuantity(cartId, qty - 1); }

async function updateQuantity(cartId, newQty) {
    try {
        // 🔧 Sửa: bỏ userId, thêm headers
        const res = await fetch(`${API_BASE}/${cartId}`, {
            method: "PUT",
            headers: headers,
            body: JSON.stringify({ quantity: newQty }),
        });
        if (!res.ok) throw new Error("Cập nhật thất bại");
        await loadCart();
    } catch (err) { console.error(err); }
}

async function removeItem(cartId) {
    if (!confirm("Xóa sản phẩm này?")) return;
    await fetch(`${API_BASE}/${cartId}`, { method: "DELETE", headers });
    await loadCart();
}

async function removeSelected() {
    const selected = Array.from(document.querySelectorAll(".select-item:checked"))
        .map(cb => cb.dataset.id);
    if (selected.length === 0) return alert("Chưa chọn sản phẩm!");
    if (!confirm("Xóa các sản phẩm đã chọn?")) return;

    for (let id of selected) {
        await fetch(`${API_BASE}/${id}`, { method: "DELETE", headers });
    }
    await loadCart();
}

function checkout() {
    const selected = Array.from(document.querySelectorAll(".select-item:checked"))
        .map(cb => cb.dataset.id);
    if (selected.length === 0) return alert("Bạn chưa chọn sản phẩm nào!");
    alert("Đặt hàng thành công với sản phẩm ID: " + selected.join(", "));
}

function toggleSelectAll(source) {
    document.querySelectorAll(".select-item").forEach(cb => {
        cb.checked = source.checked;
    });
    updateTotal();
}

document.querySelector(".delete-selected-btn").addEventListener("click", removeSelected);
document.querySelector(".checkout-btn").addEventListener("click", checkout);

window.addEventListener("DOMContentLoaded", loadCart);

function goInfo() {
    var productItems = document.querySelectorAll(".cart__info-product");
    productItems.forEach(function (item) {
        item.addEventListener("click", function () {
            var productName = item.querySelector(".product__info h3").innerText;
            var productImage = item.querySelector(".product__media-img").src;
            var productPrice = item.querySelector(".product__price span:first-child").innerHTML;
            var productPrice2 = productPrice.slice(0, productPrice.indexOf("₫")).replace("&nbsp;", "");
            localStorage.setItem("productName", productName);
            localStorage.setItem("productImage", productImage);
            localStorage.setItem("productPrice", productPrice2);
            window.location.href = "info.html";
        });
    });
}
