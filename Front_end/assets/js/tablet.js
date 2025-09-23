let products = [];
let filteredProducts = [];

async function fetchProducts() {
    try {
        const url = "http://127.0.0.1:8000/api/abs?type=tablet";
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        products = await response.json();
        console.log(products)
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
        .filter(product => product.percent_abs >= 0 && product.phanloai === "tablet") // Chỉ hiển thị sản phẩm có khuyến mãi và là điện thoại
        .map(function (product) {
            var now = new Date();
            var end = new Date(product.end_time);
            var diffMs = end - now;

            var timeLeft = "Hết hạn";
            if (diffMs > 0) {
                var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                var diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
                var diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
                timeLeft = `${diffDays} ngày ${diffHours} giờ ${diffMinutes} phút`;
            }

            var price = Number(product.price) || 0;
            var percent = Number(product.percent_abs) || 0;
            var priceSale = new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "VND",
            }).format(price - (percent / 100) * price);
            if (product.percent_abs > 0) {
                return `
                    <div class="col-lg-3 col-md-4 col-6 my-3">
                        <div class="product__item">
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
                        <div class="product__item">
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

    // Gắn vào danh sách
    phonesList.innerHTML = htmls;

    // Thêm sự kiện click để chuyển hướng tới trang chi tiết
    var productItems = document.querySelectorAll(".product__item");
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

function applyFilters() {
    const priceFilter = document.querySelector('input[name="priceFilter"]:checked').value;
    const brandFilter = document.querySelector('input[name="brandFilter"]:checked').value;

    filteredProducts = products.filter(product => {
        let priceMatch = true;
        if (priceFilter === "under10") {
            priceMatch = product.price < 10000000;
        } else if (priceFilter === "10to20") {
            priceMatch = product.price >= 10000000 && product.price <= 20000000;
        } else if (priceFilter === "over20") {
            priceMatch = product.price > 20000000;
        }

        let brandMatch = true;
        if (brandFilter !== "all") {
            brandMatch = product.brand === brandFilter;
        }

        return priceMatch && brandMatch;
    });

    renderProducts(filteredProducts);
}

// Sự kiện thay đổi bộ lọc
document.querySelectorAll('input[name="priceFilter"], input[name="brandFilter"]').forEach(input => {
    input.addEventListener("change", applyFilters);
});

// Load sản phẩm khi trang mở
fetchProducts();