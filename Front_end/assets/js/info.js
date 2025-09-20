//render ở trang info.html
var productName = localStorage.getItem("productName");
var productImage = localStorage.getItem("productImage");
var productPrice = localStorage.getItem("productPrice");
var productPrice2 = productPrice.replace(/\n/g, "");

let name1 = "Samsung Galaxy S24 5G 8GB/256GB";
async function fetchProducts(name = null) {
    try {
        let url = "http://127.0.0.1:8000/product_name";
        if (name) url += "?name=" + name;
        const response = await fetch(url);
        const data = await response.json();
        products = data;
        var headingInfo = document.querySelector(".info__heading");
        headingInfo.innerText = products.name;

        var breadcrumbInfo = document.querySelector(".breadcrumb-name");
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
fetchProducts(productName);

// Thêm sản phẩm vào giỏ hàng
var btnAddCart = document.querySelector(".groupbtn__cart");

// Mỗi khi click thì lưu thông tin vào LocalStorage với key là tên sản phẩm và value là 1 object chứa thông tin sản phẩm đó (tên, giá, ảnh, số lượng)
btnAddCart.addEventListener("click", function () {
    var product = {
        name: productName,
        price: productPrice2,
        image: productImage,
        quantity: 1,
    };

    // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
    var cart = JSON.parse(localStorage.getItem("cart"));
    if (cart == null) {
        // Nếu chưa có thì tạo mới giỏ hàng và thêm sản phẩm vào
        var cart = {};
        cart[productName] = product;
        alert("Thêm sản phẩm vào giỏ hàng thành công");
    } else {
        // Nếu đã có thì kiểm tra xem sản phẩm đó đã có trong giỏ hàng chưa
        if (cart[productName] == undefined) {
            // Nếu chưa có thì thêm sản phẩm vào
            cart[productName] = product;
            alert("Thêm sản phẩm vào giỏ hàng thành công");
        } else {
            // Nếu đã có thì tăng số lượng lên 1
            cart[productName].quantity += 1;
            alert("Thêm sản phẩm vào giỏ hàng thành công");
        }
    }

    // Lưu lại thông tin giỏ hàng vào LocalStorage
    localStorage.setItem("cart", JSON.stringify(cart));

    // conlog cart
    // console.log(cart);
});

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
