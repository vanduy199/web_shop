// Thay đổi selector:
const cartContent = document.querySelector(".cart__content"); // Dùng cho danh sách div
const totalPriceElement = document.querySelector(".total-price-text") || document.querySelector(".total-price"); 

const API_BASE = "http://127.0.0.1:8000/cart";

// 🟢 Lấy token từ localStorage
const token = localStorage.getItem("access_token"); 

// 🟢 Headers cho tất cả request
const headers = token
    ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
    : { "Content-Type": "application/json" };

// Load giỏ hàng (Đã sửa để render DIV thay vì TR)
async function loadCart() {
    try {
        const res = await fetch(`${API_BASE}/`, { headers });
        if (!res.ok) throw new Error("Không load được giỏ hàng");
        let carts = await res.json();

        if (!Array.isArray(carts)) {
            carts = carts ? [carts] : [];
        }

        const selectedBefore = Array.from(
            document.querySelectorAll(".select-item:checked")
        ).map(cb => cb.dataset.id);

        cartContent.innerHTML = "";
        if (carts.length === 0) {
            totalPriceElement.textContent = "Tổng thanh toán: 0 đ";
            cartContent.innerHTML = `
                <div style="text-align:center; padding: 30px; border: 1px solid #eee;">Không có sản phẩm nào trong giỏ hàng.</div>`;
            return;
        }

        carts.forEach(item => {
            const isChecked = selectedBefore.includes(item.id.toString());
            const productPrice = item.product?.price || 0;
            const itemTotal = productPrice * item.quantity;

            cartContent.innerHTML += `
                <div class="cart-item" data-id="${item.id}">
                    
                    <div class="cart-item-left">
                        <input type="checkbox" class="select-item product-checkbox"
                            data-id="${item.id}" 
                            data-price="${productPrice}"
                            data-qty="${item.quantity}"
                            ${isChecked ? "checked" : ""} style="width: 18px; height: 18px; cursor: pointer;">
                        
                        <img src="${item.product?.thumb || ''}" alt="${item.product?.name || "N/A"}"/>
                        <span class="name">${item.product?.name || "N/A"}</span>
                    </div>

                    <div class="cart-item-right">
                        
                        <div class="price">
                            <span class="cart__info-price" data-id="${item.id}">
                                ${productPrice.toLocaleString("vi-VN")} đ
                            </span>
                        </div>

                        <div class="quantity-control">
                            <button class="btn-decrease" data-id="${item.id}">-</button>
                            <input type="text" class="quantity-value" 
                                id="qty-${item.id}" value="${item.quantity}" readonly>
                            <button class="btn-increase" data-id="${item.id}">+</button>
                        </div>

                        <div class="price">
                            <span class="item-total-price" id="item-total-${item.id}">
                                ${itemTotal.toLocaleString("vi-VN")} đ
                            </span>
                        </div>

                        <button class="btn-remove remove" data-id="${item.id}">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        // Gắn lại sự kiện cho các nút và checkbox mới
        document.querySelectorAll(".select-item").forEach(cb => {
            cb.addEventListener("change", updateTotal);
        });
        document.querySelectorAll(".btn-increase").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                const inputElement = document.getElementById(`qty-${id}`);
                const qty = parseInt(inputElement.value, 10);
                increase(id, qty);
            });
        });
        document.querySelectorAll(".btn-decrease").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                const inputElement = document.getElementById(`qty-${id}`);
                const qty = parseInt(inputElement.value, 10);
                decrease(id, qty);
            });
        });
        document.querySelectorAll(".btn-remove").forEach(btn => {
            btn.addEventListener("click", () => {
                removeItem(btn.dataset.id);
            });
        });
        
        // Cập nhật lại tổng tiền sau khi load
        updateTotal();
    } catch (err) {
        console.error(err);
    }
}

// giữ controller ở scope ngoài để có thể abort request trước đó
let lastCalcController = null;

// Tính tổng tiền và cập nhật Thành tiền từng sản phẩm
async function updateTotal() {
    const selectedCheckboxes = Array.from(document.querySelectorAll(".select-item:checked"));
    const selected = selectedCheckboxes.map(cb => cb.dataset.id);

    // Cập nhật giá trị Thành tiền (item-total) cho các sản phẩm
    document.querySelectorAll('.cart-item').forEach(itemDiv => {
        const id = itemDiv.dataset.id;
        const priceElement = itemDiv.querySelector(".cart__info-price");
        const qtyElement = itemDiv.querySelector(`#qty-${id}`);
        const totalElement = itemDiv.querySelector(`#item-total-${id}`);
        
        if (priceElement && qtyElement && totalElement) {
            const priceText = priceElement.textContent;
            const price = parseInt(priceText.replace(/[^\d]/g, ""), 10) || 0;
            const qty = parseInt(qtyElement.value, 10) || 0;

            const itemTotal = price * qty;
            totalElement.textContent = itemTotal.toLocaleString("vi-VN") + " đ";
        }
    });


    if (selected.length === 0) {
        totalPriceElement.textContent = "Tổng thanh toán: 0 đ";
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
        totalPriceElement.textContent = "Tổng thanh toán: " + total.toLocaleString("vi-VN") + " đ";
    } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Lỗi tính tổng:", err);

        // Fallback tính tổng nếu API lỗi
        let total = 0;
        selected.forEach(id => {
            const itemDiv = document.querySelector(`.cart-item[data-id="${id}"]`);
            if (!itemDiv) return;
            
            const priceText = itemDiv.querySelector(".cart__info-price")?.textContent || "0";
            const price = parseInt(priceText.replace(/[^\d]/g, ""), 10) || 0;
            const qtyElement = itemDiv.querySelector(`#qty-${id}`);
            const qty = parseInt(qtyElement.value.replace(/[^\d]/g, ""), 10) || 0;
            total += price * qty;
        });

        totalPriceElement.textContent = "Tổng thanh toán: " + total.toLocaleString("vi-VN") + " đ";
    }
}

// 🟢 Thêm sản phẩm vào giỏ (POST /cart)
async function addToCart(productId, quantity = 1) {
    try {
        console.log("Thêm vào giỏ:", productId, quantity);

        const res = await fetch(`${API_BASE}/`, {
            method: "POST",
            headers: headers, 
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
async function decrease(cartId, qty) { 
    if (qty > 1) await updateQuantity(cartId, qty - 1); 
    else removeItem(cartId); // Xóa nếu giảm xuống 0
}

async function updateQuantity(cartId, newQty) {
    try {
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
    if (!confirm("Xóa sản phẩm này khỏi giỏ hàng?")) return;
    await fetch(`${API_BASE}/${cartId}`, { method: "DELETE", headers });
    await loadCart();
}

async function removeSelected() {
    const selected = Array.from(document.querySelectorAll(".select-item:checked"))
        .map(cb => cb.dataset.id);
    if (selected.length === 0) return alert("Chưa chọn sản phẩm!");
    if (!confirm(`Xóa ${selected.length} sản phẩm đã chọn?`)) return;

    // Xóa từng sản phẩm đã chọn
    for (let id of selected) {
        await fetch(`${API_BASE}/${id}`, { method: "DELETE", headers });
    }
    await loadCart();
}

function checkout() {
    const selected = Array.from(document.querySelectorAll(".select-item:checked"))
        .map(cb => cb.dataset.id);
    
    if (selected.length >= 1) {
        localStorage.removeItem("booked");
        localStorage.setItem("booked", selected);
        localStorage.setItem("point", "cart");
        window.location.href = "booking.html";
    }
    else {
        alert("Chưa chọn sản phẩm.");
    }
}

function toggleSelectAll(source) {
    // Hàm này không còn được dùng vì đã xóa checkbox 'Chọn tất cả'
    document.querySelectorAll(".select-item").forEach(cb => {
        cb.checked = source.checked;
    });
    updateTotal();
}

// Gắn sự kiện cho các nút Xóa/Đặt hàng
document.querySelector(".delete-selected-btn")?.addEventListener("click", removeSelected);
document.querySelector(".checkout-btn")?.addEventListener("click", checkout);

window.addEventListener("DOMContentLoaded", loadCart);

function goInfo() {
    var productItems = document.querySelectorAll(".cart-item .cart-item-left .name"); 
    
    productItems.forEach(function (item) {
        item.addEventListener("click", function () {
            const parentDiv = item.closest('.cart-item');
            if (!parentDiv) return;

            const productName = item.textContent;
            const productImage = parentDiv.querySelector("img")?.src;
            const productPriceText = parentDiv.querySelector(".cart__info-price")?.textContent;
            
            const productPrice2 = productPriceText?.replace(/[^\d]/g, "") || ""; 

            localStorage.setItem("productName", productName);
            localStorage.setItem("productImage", productImage);
            localStorage.setItem("productPrice", productPrice2);
            window.location.href = "info.html";
        });
    });
}
document.addEventListener("DOMContentLoaded", () => {
    loadCart();
    setTimeout(goInfo, 500); 
});