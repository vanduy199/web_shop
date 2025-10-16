const generateRandomString = (length) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * characters.length)
        );
    }
    return result;
};

// Lấy tổng tiền từ giao diện
let totalPriceOrder = document.querySelector(".price-total")?.innerText || "0";
// Ví dụ: "Tổng thanh toán: 40.300.000 ₫" -> lấy 40.300.000
totalPriceOrder = totalPriceOrder.replace(/[^\d]/g, ""); 
totalPriceOrder = parseInt(totalPriceOrder) || 0;

const orderButton = document.querySelector(".order-product");
var cart = JSON.parse(localStorage.getItem("cart"));

if (cart == null || Object.keys(cart).length == 0) {
    const cartList = document.querySelector(".cart__list");
    if (cartList) {
        cartList.innerHTML = `
        <div class="cartempty">
            <i class="fa-solid fa-cart-shopping"></i>
            <span>Không có sản phẩm nào trong giỏ hàng</span>
            <a href="index.html" class="backhome">Về trang chủ</a>
        </div>
        `;
    }
    const totalCost = document.querySelector(".total-cost");
    if (totalCost) totalCost.style.display = "none";
}

if (orderButton) {
    orderButton.addEventListener("click", () => {
        // check login trước khi đặt hàng
        var isLogin = localStorage.getItem("tokenLogin");
        if (!isLogin) {
            alert("Vui lòng đăng nhập để đặt hàng!");
            window.location.replace("./login.html"); 
        } else {
            const data = JSON.parse(localStorage.getItem("cart"));
            if (data) {
                const isConfirm = window.confirm(
                    "Vui lòng kiểm tra lại đơn hàng trước khi xác nhận. Bạn có chắc chắn muốn đặt hàng không?"
                );
                if (isConfirm) {
                    alert("Đặt hàng thành công!");
                    
                    // Định dạng lại dữ liệu order
                    const order = {
                        id: generateRandomString(6),
                        items: data, // danh sách sản phẩm trong giỏ
                        date: new Date().toLocaleDateString("vi-VN"),
                        total: totalPriceOrder,
                        status: "Đang xử lý"
                    };

                    let orders = JSON.parse(localStorage.getItem("orders")) || [];
                    orders.push(order);
                    localStorage.setItem("orders", JSON.stringify(orders));

                    // Xóa giỏ hàng
                    localStorage.removeItem("cart");
                    window.location.href = "./order.html";
                }
            }
        }
    });
}
