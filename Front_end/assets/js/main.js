// Biến lưu danh mục hiện tại
let currentType = null;

// Hàm render sản phẩm
function renderProducts(products) {
    var smartphoneListBlock = $("#smartphones-list"); // Dùng jQuery để chọn container
    smartphoneListBlock.empty(); // Xóa nội dung cũ trước khi render
    if (smartphoneListBlock.hasClass('slick-initialized')) {
        smartphoneListBlock.slick('unslick');
    }
    smartphoneListBlock.removeClass('slick-initialized slick-slider');
    var smartphone = products
        .filter(product => product.price !== null && product.price !== undefined) // Loại bỏ sản phẩm không hợp lệ
        .map(function (product) {
            // Tính thời gian khuyến mãi
            var now = new Date();
            var end = product.end_time ? new Date(product.end_time) : null;
            var timeLeft = "Không có khuyến mãi";
            if (end && end > now) {
                var diffMs = end - now;
                var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                var diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
                var diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
                timeLeft = `${diffDays} ngày ${diffHours} giờ ${diffMinutes} phút`;
            } else if (end) {
                timeLeft = "Hết hạn";
            }
            if (timeLeft == "Không có khuyến mãi" || timeLeft == "Hết hạn") {
                return;
            }
            // Tính giá sau giảm giá
            var price = Number(product.price) || 0;
            var percent = Number(product.percent_abs) || 0;
            var priceSale = new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
            }).format(price * (1 - percent / 100));

            // Render HTML cho sản phẩm (hiển thị tất cả danh mục)
            return `
                <div class="col-lg-3 col-md-4 col-sm-6 col-12 my-3">
                    <div class="product__item" data-id="${product.id}">
                        <div class="product__media">
                            <img
                                src="${product.thumb}"
                                alt="${product.name}"
                                class="product__media-img"
                            />
                            <span class="product__media-note">
                                <p>BẢO HÀNH 12 THÁNG</p>
                            </span>
                            ${percent > 0 ? `<div class="product__media-promotion">-${percent}%</div>` : ""}
                        </div>
                        <div class="product__info">
                            <h3>${product.name}</h3>
                            <div class="product__price">
                                <span>${priceSale}</span>
                                ${percent > 0 ? `<span class="line-through">${new Intl.NumberFormat("vi-VN", {
                                    style: "currency",
                                    currency: "VND",
                                }).format(price)}</span>` : ""}
                            </div>
                            <p class="product__desc">
                                <strong>${timeLeft}</strong>
                            </p>
                        </div>
                    </div>
                </div>
            `;
        })
        .join("");

    // Gắn vào danh sách
    smartphoneListBlock.append(smartphone);

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

// Hàm fetch dữ liệu từ API
async function fetchData(type = null) {
    try {
        let url = "http://127.0.0.1:8000/api/abs?show_abs=true";
        if (type) {
            url = `http://127.0.0.1:8000/api/abs?type=${type}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log("API Data:", data);
        renderProducts(data.show_product);
    } catch (error) {
        console.error("Error fetching products:", error);
    }
}

// Thêm sự kiện click cho các nút
document.addEventListener('DOMContentLoaded', function () {
    const buttons = [
        { id: "all_fix", type: null },
        { id: "phone_fix", type: "phone" },
        { id: "laptop_fix", type: "laptop" },
        { id: "tablet_fix", type: "tablet" },
        { id: "phukien_fix", type: "phukien" }
    ];

    buttons.forEach(({ id, type }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', function () {
                // Xóa class active của tất cả nút

                currentType = type;
                fetchData(type);
            });
        }
    });

    // Tải dữ liệu ban đầu (tất cả sản phẩm)
    fetchData(null);
});

const url_banners = "http://127.0.0.1:8000/banners/raw";

(async () => {
    try {
        const response = await fetch(url_banners, {
            method: "GET",
        });

        if (response.ok) {
            const banners = await response.json();
            console.log("Banners Data:", banners);
            renderBanners(banners);
        } else {
            console.error("Lỗi HTTP:", response.status, response.statusText);
        }
    } catch (error) {
        console.error("Lỗi kết nối đến server:", error);
        alert("Không thể kết nối tới máy chủ. Vui lòng thử lại sau.");
    }
})();

function renderBanners(Banners) {
    const link_base = "http://127.0.0.1:8000";
    console.log("Rendering banners:", Banners);
    
    // Top banner
    const bannerTopImg = document.getElementById("banner-top-img");
    const topBanner = Banners.find(banner => banner.position === 'homepage_top');
    if (bannerTopImg && topBanner) {
        bannerTopImg.src = link_base + topBanner.image_url;
    }
    
    // Mid-left banner
    const bannermidLImg = document.getElementById("banner-mid-left-img");
    const midLeftBanner = Banners.find(banner => banner.position === 'homepage_mid_left');
    if (bannermidLImg && midLeftBanner) {
        bannermidLImg.src = link_base + midLeftBanner.image_url;
    }
    
    // Mid-center banner
    const bannermidMImg = document.getElementById("banner-mid-center-img");
    const midCenterBanner = Banners.find(banner => banner.position === 'homepage_mid_center');
    if (bannermidMImg && midCenterBanner) {
        bannermidMImg.src = link_base + midCenterBanner.image_url;
    }
    
    // Mid-right banner
    const bannermidRImg = document.getElementById("banner-mid-right-img");
    const midRightBanner = Banners.find(banner => banner.position === 'homepage_mid_right');
    if (bannermidRImg && midRightBanner) {
        bannermidRImg.src = link_base + midRightBanner.image_url;
    }
}
    