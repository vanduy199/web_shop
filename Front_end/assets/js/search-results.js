let products = [];
let filteredProducts = [];
let page = 1;
let baseUrl = "http://127.0.0.1:8000/api/search";
const urlParams = new URLSearchParams(window.location.search);
const query = urlParams.get('q') || '';
const myInput = document.getElementById("search-product");
myInput.value = query;
// Function để build URL với param
function getUrlWithParams(q, pageNum, sortPrice) {
    let url = `${baseUrl}?q=${encodeURIComponent(q)}&page=${pageNum}`;
    if (sortPrice) url += `&sort_price=${sortPrice}`;
    return url;
}

// Function để get current filter values
function getCurrentFilters() {
    const sortPrice = document.querySelector('#sortPrice')?.value || '';
    return { sortPrice };
}

async function fetchProducts(append = false) {
    if (!query) {
        console.error('No search query provided');
        return;
    }

    const filters = getCurrentFilters();
    const url = getUrlWithParams(query, page, filters.sortPrice);
    
    try {
        console.log('Fetching from:', url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const json_data = await response.json();
        console.log('API Response:', json_data);
        
        let productList = json_data.show_product?.show_product || [];
        const totalCount = json_data.number || 0;
        
        // Cập nhật số kết quả
        const resultsCount = document.getElementById("results-count");
        if (resultsCount) {
            resultsCount.innerHTML = totalCount;
        }
        
        // Cập nhật query hiển thị
        const searchQueryDisplay = document.getElementById("search-query-display");
        if (searchQueryDisplay) {
            searchQueryDisplay.innerHTML = `"<strong>${query}</strong>"`;
        }
        
        if (!productList || productList.length === 0) {
            if (!append) {
                renderNoResults();
            }
            document.getElementById("view-more").style.display = "none";
            console.log("No products found");
            return;
        }
        
        if (append) {
            // Append sản phẩm mới
            filteredProducts = [...filteredProducts, ...productList];
            renderProducts(productList, true);
        } else {
            // Load ban đầu
            products = productList;
            filteredProducts = [...productList];
            renderProducts(filteredProducts, false);
        }
    
        document.getElementById("view-more").style.display = 
            productList.length < 20 ? "none" : "block";
        
        console.log("Products loaded:", products.length);
        console.log("Filtered Products:", filteredProducts.length);
    } catch (error) {
        console.error("Error fetching products:", error);
        alert("Không tải được sản phẩm! " + error.message);
    }
}

function renderProducts(products, append = false) {
    const phonesList = document.getElementById("phones-list");
    if (!append) {
        phonesList.innerHTML = "";
    }

    const htmls = products
        .filter(product => product && product.price)
        .map(function (product) {
            var price = Number(product.price) || 0;
            var percent = Number(product.percent_abs) || 0;
            var discountedPrice = price - (percent / 100) * price;
            
            var priceSale = new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
            }).format(discountedPrice);
            
            var originalPrice = new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
            }).format(price);
            
 if (product.percent_abs > 0) {
                return `
                    <div class="col-product-5">
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
                    <div class="col-product-5">
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
            var productId = item.getAttribute("data-id");
            var productName = item.querySelector(".product__info h3").innerText;
            var productImage = item.querySelector(".product__media-img").src;
            var productPrice = item.querySelector(".product__price").innerText;
            var productPrice2 = productPrice.replace(/[^0-9]/g, "");
            
            localStorage.setItem("productId", productId);
            localStorage.setItem("productName", productName);
            localStorage.setItem("productImage", productImage);
            localStorage.setItem("productPrice", productPrice2);
            window.location.href = "info.html";
        });
    });
}

function renderNoResults() {
    const phonesList = document.getElementById("phones-list");
    phonesList.innerHTML = `
        <div class="no-results text-center" style="grid-column: 1/-1; padding: 40px;">
            <div style="font-size: 48px;">🔍</div>
            <h3>Không tìm thấy sản phẩm</h3>
            <p>Từ khóa tìm kiếm "<strong>${query}</strong>" không có kết quả</p>
            <a href="index.html" class="btn btn-primary mt-3">Quay lại trang chủ</a>
        </div>
    `;
}

function applyFilters() {
    page = 1;
    fetchProducts(false);
}

// Event listeners
document.querySelectorAll('input[name="priceFilter"], input[name="brandFilter"], #sortPrice').forEach(input => {
    input?.addEventListener("change", applyFilters);
});

const viewMoreBtn = document.getElementById("view-more");
if (viewMoreBtn) {
    viewMoreBtn.onclick = function () {
        page += 1;
        fetchProducts(true);
    }
}

// Load sản phẩm ban đầu
fetchProducts(false);