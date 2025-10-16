//render ở trang info.html
var productName = localStorage.getItem("productName");
var productId = localStorage.getItem("productId");
var productImage = localStorage.getItem("productImage");
var productPrice = localStorage.getItem("productPrice");
var productPrice2 = productPrice.replace(/\n/g, "");

let name1 = "Samsung Galaxy S24 5G 8GB/256GB";
async function fetchProducts(id = null) {
    try {
        let url = "http://127.0.0.1:8000/api/product_id";
        if (id) url += "?id=" + id;
        const response = await fetch(url);
        const data = await response.json();
        const products = data;
        var headingInfo = document.querySelector(".info__heading");
        headingInfo.innerText = products.name;
        console.log(products.id)
        var breadcrumbInfo = document.querySelector(".info__heading");
        breadcrumbInfo.innerText = products.name;

        let img1 = document.querySelector("#img1");
        img1.src = products.images[0].img;

        let img2 = document.querySelector("#img2");
        img2.src = products.images[1].img;

        let img3 = document.querySelector("#img3");
        img3.src = products.images[2].img;

        let img4 = document.querySelector("#img4");
        img4.src = products.images[3].img;

        let img5 = document.querySelector("#img5");
        img5.src = products.images[4].img;

        var priceInfo = document.querySelector(".info__right-price");
        priceInfo.innerHTML = products.price.toLocaleString() + "₫";
        console.log(data);
        const grouped = data.attributes.reduce((acc, item) => {
            if (!acc[item.loai_cau_hinh]) acc[item.loai_cau_hinh] = [];
            acc[item.loai_cau_hinh].push(item);
            return acc;
        }, {});
        const order = {
            "Cấu hình": 1,
            "Camera & Màn hình": 2,
            "Kết nối": 3,
            "Tiện ích": 4,
            "Pin & Sạc": 5,
            "Thiết kế & Chất liệu": 6
        };

// Lấy các nhóm từ object grouped
        let groups = Object.keys(grouped);
        // add to cart
        var btnAddCart = document.querySelector(".groupbtn__cart");
        btnAddCart.onclick = function() {
            addToCart(productId, 1);
        };
        
        // Sắp xếp lại theo order
        groups.sort((a, b) => (order[a] || 999) - (order[b] || 999));
        const container = document.getElementById("specifications");
        groups.forEach(group => {
            const groupDiv = document.createElement("div");
            groupDiv.classList.add("spec-group");

            const header = document.createElement("div");
            header.classList.add("spec-header");
            header.textContent = group;
            
            const content = document.createElement("div");
            content.style.display = "block";
            content.classList.add("spec-content");

            grouped[group].forEach(item => {
                const row = document.createElement("div");
                row.classList.add("spec-item");

                row.innerHTML = `
                <div class="spec-key">${item.key}</div>
                <div class="spec-value">${item.value}</div>
            `;
                content.appendChild(row);
            });

            groupDiv.appendChild(header);
            groupDiv.appendChild(content);
            container.appendChild(groupDiv);
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        showMessage("Không tải được sản phẩm!", "error");
    }
};
fetchProducts(productId);

// Thêm sản phẩm vào giỏ hàng


function seeMore() {
    var dots = document.getElementById("dots");
    var moreText = document.getElementById("more");
    var btnText = document.getElementById("myBtn");

    if (dots.style.display === "none") {
        dots.style.display = "inline";
        btnText.innerHTML = "Xem thêm";
        moreText.style.display = "none";
    } else {
        dots.style.display = "none";
        btnText.innerHTML = "Thu gọn";
        moreText.style.display = "inline";
    }
}

// đặt lịch sửa chữa
var booking = document.querySelector(".groupbtn__order");
booking.addEventListener("click", function () {
    window.location.href = "booking.html";
});
var swiper = new Swiper(".mySwiper", {
  slidesPerView: 1,
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
});
const API_BASE = "http://127.0.0.1:8000/cart";

// 🟢 Lấy token từ localStorage
const token = localStorage.getItem("access_token"); // DÙNG access_token

// 🟢 Headers cho tất cả request
const headers = token
  ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
  : { "Content-Type": "application/json" };

// 🟢 Không cần userId cố định — backend lấy từ token
const userId = null;
async function addToCart(productId, quantity = 1) {
    try {
        console.log("Thêm vào giỏ:", productId, quantity);

        // 🟢 Đảm bảo URL là /cart/ cho POST
        const res = await fetch(`${API_BASE}/`, { 
            method: "POST",
            headers: headers, 
            body: JSON.stringify({
                product_id: Number(productId),
                quantity: Number(quantity)
            }),
        });

        let data = null;
        try { data = await res.json(); } catch (e) { /* Lỗi khi phản hồi không phải JSON */ }

        // 🟢 HIỂN THỊ MÃ LỖI RÕ RÀNG
        if (!res.ok) {
            console.error("Thêm thất bại:", res.status, data);
            
            let errorMessage = `LỖI API ${res.status}`;
            
            errorMessage = `Thêm thất bại: ${data.detail}`;

            alert(errorMessage);
            return;
        }

        console.log("Thêm thành công:", data);
        
        // 🟢 Gọi loadCart nếu nó tồn tại (thường là trong cart.js)
        if (typeof loadCart === 'function') {
            await loadCart();
        }
        
        alert("Đã thêm vào giỏ hàng!");
    } catch (err) {
        console.error("Lỗi mạng hoặc JS:", err);
        alert("Lỗi mạng hoặc lỗi JavaScript. Kiểm tra console.");
    }
}

