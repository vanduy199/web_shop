let products = [];
let filteredProducts = [];

async function fetchProducts() {
    try {
        const url = "http://127.0.0.1:8000/api/abs?type=phukien";
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        products = await response.json();
        console.log("API Data:", products); // Debug dữ liệu API
        filteredProducts = products;
        renderProducts(filteredProducts);
    } catch (error) {
        console.error("Error fetching products:", error);
        alert("Không tải được sản phẩm!");
    }
}

function renderProducts(products) {
    const phonesList = document.getElementById("phones-list");
    phonesList.innerHTML = ""; // Xóa nội dung cũ

    const htmls = products
        .filter(product => product.price !== null && product.price !== undefined) // Loại bỏ sản phẩm không hợp lệ
        .map(function (product) {
            var now = new Date();
            var end = product.end_time ? new Date(product.end_time) : null;
            var timeLeft = "Không có khuyến mãi";
            if (end && end > now) {
                var diffMs = end - now;
                var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                var diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
                var diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
                timeLeft = `${diffDays} ngày ${diffHours} giờ ${diffMinutes} phút`;
            }

            var price = Number(product.price) || 0;
            var percent = Number(product.percent_abs) || 0;
            var priceSale = new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
            }).format(price * (1 - percent / 100));

if (product.percent_abs > 0) {
                return `
                    <div class="col-lg-3 col-md-4 col-6 my-3">
                        <div class="product__item" data-id="${product.id}">
                            <div class="product__media">
                                <img src="${product.thumb}" alt="${product.name}" class="product__media-img" />
                                <span class="product__media-note">
                                    <p>BẢO HÀNH 12 THÁNG</p>
                                </span>
                                <div class="product__media-promotion">-${product.percent_abs}%</div>
                            </div>
                            <div class="product__info">
                                <h3>${product.name}</h3>
                                <div class="product__price">
                                    <span>${priceSale}</span>
                                    <span class="line-through">${new Intl.NumberFormat("de-DE", {
                                        style: "currency",
                                        currency: "VND",
                                    }).format(product.price)}</span>
                                </div>
                             
                            </div>
                        </div>
                    </div>
                `;
            }
            else {
                return `
                    <div class="col-lg-3 col-md-4 col-6 my-3">
                        <div class="product__item" data-id="${product.id}">
                            <div class="product__media">
                                <img src="${product.thumb}" alt="${product.name}" class="product__media-img" />
                                <span class="product__media-note">
                                    <p>BẢO HÀNH 12 THÁNG</p>
                                </span>
                            </div>
                            <div class="product__info">
                                <h3>${product.name}</h3>
                                <div class="product__price">
                                    <span>${priceSale}</span>
                                    <span class="line-through">${new Intl.NumberFormat("de-DE", {
                                        style: "currency",
                                        currency: "VND",
                                    }).format(product.price)}</span>
                                </div>
                                
                            </div>
                        </div>
                    </div>
                `;
            }
            
        })
        .join("");

    phonesList.innerHTML = htmls;

    // Thêm sự kiện click để chuyển hướng tới trang chi tiết
    var productItems = document.querySelectorAll(".product__item");
    productItems.forEach(function (item) {
        item.addEventListener("click", function () {
            var productId = item.getAttribute("data-id")
            var productName = item.querySelector(".product__info h3").innerText;
            var productImage = item.querySelector(".product__media-img").src;
            var productPrice = item.querySelector(".product__price span:first-child").innerText;
            var productPrice2 = productPrice.replace(/[^0-9]/g, "");
            // Loại bỏ ký tự không phải số
            localStorage.setItem("productId", productId);
            localStorage.setItem("productName", productName);
            localStorage.setItem("productImage", productImage);
            localStorage.setItem("productPrice", productPrice2);
            window.location.href = "info.html";
        });
    });
}

function applyFilters() {
    const phanloaiFilter = document.querySelector('input[name="phanloaiFilter"]:checked').value;
    const brandFilter = document.querySelector('input[name="brandFilter"]:checked').value;

    filteredProducts = products.filter(product => {
        let phanloaiMatch = phanloaiFilter === "all" || product.phanloai === phanloaiFilter;
        let brandMatch = brandFilter === "all" || product.brand === brandFilter;

        return phanloaiMatch && brandMatch;
    });

    if (sortPrice === "asc") {
        filteredProducts.sort((a, b) => (a.price * (1 - (a.percent_abs || 0) / 100)) - (b.price * (1 - (b.percent_abs || 0) / 100)));
    } else if (sortPrice === "desc") {
        filteredProducts.sort((a, b) => (b.price * (1 - (b.percent_abs || 0) / 100)) - (a.price * (1 - (a.percent_abs || 0) / 100)));
    }

    console.log("Filtered and Sorted Products:", filteredProducts); // Debug danh sách sản phẩm sau lọc và sắp xếp
    renderProducts(filteredProducts);
}

// Sự kiện thay đổi bộ lọc
document.querySelectorAll('input[name="phanloaiFilter"], input[name="brandFilter"]').forEach(input => {
    input.addEventListener("change", applyFilters);
});

// Load sản phẩm khi trang mở
fetchProducts();