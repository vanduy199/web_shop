function renderProducts(products) {
    var smartphoneListBlock = $("#smartphones-list"); // dùng jQuery cho slick
    var smartphone = products.map(function (product) {
        if (product.percent_abs == 0) {
            return;
        }
        var now = new Date();
        var end = new Date(product.end_time);

        var diffMs = end - now;

        if (diffMs > 0) {
            var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            var diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
            var diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);

            var timeLeft = `${diffDays} ngày ${diffHours} giờ ${diffMinutes} phút`;
        } else {
            var timeLeft = "Hết hạn";
        }
        var price = Number(product.price) || 0;
        var percent = Number(product.percent_abs) || 0;
        var priceSale = new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "VND",
        }).format(price - (percent / 100) * price); 
        if (product.phanloai === "phone" || product.phanloai === "laptop") {
            return `
        <div class="product__item">
            <div class="product__media">
                <img
                    src="${product.thumb}"
                    alt=""
                    class="product__media-img"
                />
                <span class="product__media-note">
                    <p>BẢO HÀNH 12 THÁNG</p>
                </span>
                <div class="product__media-promotion">-${product.percent_abs}%</div>
            </div>
            <div class="product__info">
                <h3>${product.name}</h3>
                <div class="product__price">
                    <span>${priceSale}</span>
                    <span>${new Intl.NumberFormat("de-DE", {
                        style: "currency",
                        currency: "VND",
                    }).format(product.price)}</span>
                </div>
                <p class="product__desc">
                    <strong>${timeLeft}</strong>
                </p>
            </div>
        </div>
        `;
        }
    }).join("");

    // Gắn vào danh sách
    smartphoneListBlock.append(smartphone);

    // Nếu slick đã init thì refresh
    if (smartphoneListBlock.hasClass('slick-initialized')) {
        smartphoneListBlock.slick('refresh');
    } else {
        smartphoneListBlock.slick({
            slidesToShow: 4,
            slidesToScroll: 1,
            infinite: false,
        });
    }
    var productItems = document.querySelectorAll(".product__item");
    productItems.forEach(function(item) {
        item.addEventListener("click", function () {
            var productName = item.querySelector(".product__info h3").innerText;
            var productImage = item.querySelector(".product__media-img").src;
            var productPrice = item.querySelector(".product__price span:first-child").innerHTML;
            var productPrice2 = productPrice.slice(0, productPrice.indexOf("₫"));
            if (productPrice2.includes("&")) {
                productPrice2 = productPrice2.replace("&nbsp;", "");
            }
            localStorage.setItem("productName", productName);
            localStorage.setItem("productImage", productImage);
            localStorage.setItem("productPrice", productPrice2);
            window.location.href = "info.html";
        });
    });
}

// ========== FETCH DB ==========
fetch("http://127.0.0.1:8000/abs")
    .then(response => response.json())
    .then(data => {
        console.log(data);
        renderProducts(data);
    })
    .catch(error => {
        console.error("Error:", error);
    });

