let products = [];
let filteredProducts = [];
let page = 1;
let baseUrl = "http://127.0.0.1:8000/api/abs";

// Function để build URL với param
function getUrlWithParams(type, pageNum, price, brand, sortPrice) {
    let url = `${baseUrl}?type=${type}&page=${pageNum}`;
    if (price) url += `&price=${price}`;
    if (brand && brand !== "all") url += `&brand=${brand}`;
    if (sortPrice) url += `&sort_price=${sortPrice}`;
    return url;
}

// Function để get current filter values
function getCurrentFilters() {
    const priceFilter = document.querySelector('input[name="priceFilter"]:checked').value;
    const brandFilter = document.querySelector('input[name="brandFilter"]:checked').value;
    const sortPrice = document.querySelector('#sortPrice').value;
    
    // Map priceFilter to API value
    let price = null;
    if (priceFilter === "under10") price = 1;
    else if (priceFilter === "10to20") price = 2;
    else if (priceFilter === "over20") price = 3;
    
    return { price, brand: brandFilter, sortPrice };
}

async function fetchProducts(append = false) {
    const filters = getCurrentFilters();
    const url = getUrlWithParams("phone", page, filters.price, filters.brand, filters.sortPrice);
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.remainingQuantity === 0 && append) {
            document.getElementById("view-more").style.display = "none";
            console.log("No more products to load");
            return;
        }
        
        const viewMoreP = document.querySelector("#view-more strong");
        if (viewMoreP) {
            if (data.remainingQuantity > 0) {
                viewMoreP.innerText = `Xem thêm ${data.remainingQuantity} sản phẩm`;
                document.getElementById("view-more").style.display = "block";
            } else {
                document.getElementById("view-more").style.display = "none";
            }
        }
        
        if (append) {
            // Append sản phẩm mới (đã được back-end filter/sort)
            filteredProducts = [...filteredProducts, ...data.show_product];
            renderProducts(data.show_product, true);
        } else {
            // Load ban đầu
            products = data.show_product;
            filteredProducts = data.show_product;
            renderProducts(filteredProducts, false);
        }
        
        console.log("Products loaded:", products);
        console.log("Filtered Products:", filteredProducts);
    } catch (error) {
        console.error("Error fetching products:", error);
        alert("Không tải được sản phẩm!");
    }
}

function renderProducts(products, append = false) {
    const phonesList = document.getElementById("phones-list");
    if (!append) {
        phonesList.innerHTML = "";  // Chỉ xóa nếu không append
    }

    const htmls = products
        .filter(product => product.percent_abs >= 0)  // Back-end đã filter, nhưng giữ để an toàn
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

    // Gắn vào danh sách
    if (append) {
        phonesList.innerHTML += htmls;
    } else {
        phonesList.innerHTML = htmls;
    }

    // Thêm sự kiện click
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
    // Reset page về 1 khi filter/sort thay đổi
    page = 1;
    fetchProducts(false);  // Fetch lại từ đầu với filter mới
}

// Sự kiện thay đổi bộ lọc và sắp xếp
document.querySelectorAll('input[name="priceFilter"], input[name="brandFilter"], #sortPrice').forEach(input => {
    input.addEventListener("change", applyFilters);
});

// Load sản phẩm ban đầu
fetchProducts(false);

document.getElementById("view-more").onclick = function () {
    page += 1;
    fetchProducts(true);
}