// -------------------- Kiểm tra quyền admin --------------------
if (localStorage.getItem("tokenLogin")) {
    const user = JSON.parse(localStorage.getItem("tokenLogin"));
    if (user.isAdmin !== true) {
        showMessage("Bạn không có quyền truy cập vào trang này!", "error");
        window.location.href = "../index.html";
    }
} else {
    showMessage("Bạn chưa đăng nhập!", "error");
    window.location.href = "../login.html";
}

// -------------------- Hàm hiển thị thông báo --------------------
function showMessage(msg, type = "success") {
    const msgBox = document.getElementById("message");
    if (!msgBox) return;
    msgBox.textContent = msg;
    msgBox.className = type === "success" ? "msg-success" : "msg-error";
    msgBox.style.display = "block";
    setTimeout(() => {
        msgBox.style.display = "none";
    }, 3000);
}

// -------------------- Tiêu đề trang --------------------
const titlePage = document.querySelector("#title-page div");
function getTitlePage(item) {
    titlePage.innerHTML = `<h2>${item.textContent}</h2>`;
}

// -------------------- Sidebar --------------------
var sidebar = document.querySelector("#nav");
var sidebarToggle = document.querySelector("#sidebar_toggle");
var sidebarClose = document.querySelector("#sidebar_close");

sidebarToggle.onclick = function () {
    sidebar.classList.add("active");
};
sidebarClose.onclick = function () {
    sidebar.classList.remove("active");
};

// -------------------- Navigation items --------------------
const navItems = document.querySelectorAll(".nav__link");
const panes = document.querySelectorAll(".item-pane");
navItems.forEach((item, index) => {
    const pane = panes[index];
    item.onclick = function () {
        document.querySelector(".nav__link.active").classList.remove("active");
        document.querySelector(".item-pane.active").classList.remove("active");
        this.classList.add("active");
        pane.classList.add("active");
        getTitlePage(this);
    };
});

// -------------------- Products --------------------
let products = [];
let type = null;
let giamgia = 0;
async function fetchProducts(type) {
    try {
        let url = "http://127.0.0.1:8000/abs";
        if (type) url += "?type=" + type;
        const response = await fetch(url);
        const data = await response.json();
        if (giamgia == -1) products = data.filter(product => product.percent_abs > 0); 
        else if (giamgia == 1) products = data.filter(product => product.percent_abs == 0);     
        else  products = data;
        renderProducts(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        showMessage("Không tải được sản phẩm!", "error");
    }
}

document.getElementById('products__abs-btn').onclick = function () {
    giamgia = -1;
    fetchProducts(type);
};
document.getElementById('products__noabs-btn').onclick = function () {
    giamgia = 1;
    fetchProducts(type);
};
// Lấy tất cả sản phẩm lúc load page
fetchProducts(type);

// -------------------- Render products --------------------
function renderProducts(products) {
    const tabProductBlock = document.querySelector("#tab-products");
    tabProductBlock.innerHTML = "";
    const htmls = products.map(product => {
        let priceHTML = "";

        if (product.percent_abs > 0) {
            const oldPrice = product.price;
            const newPrice = Math.round(oldPrice * (100 - product.percent_abs) / 100);

            priceHTML = `
                <p class="price">
                    <span class="old-price">${oldPrice.toLocaleString()} đ</span>
                    <span class="new-price">${newPrice.toLocaleString()} đ</span>
                    <span class="badge-sale">-${product.percent_abs}%</span>
                </p>
            `;
        } else {
            priceHTML = `<p class="price">${product.price.toLocaleString()} đ</p>`;
        }

        return `
            <div class="product-item product-item-${product.id}">
                <h4>${product.name}</h4>
                <img src="${product.thumb}" alt="Sản phẩm ${product.id}" class="product__media-img" />
                ${priceHTML}
                <div class="group-button">
                    <button onclick="handleUpdateProduct(${product.id})" class="btn button">Sửa</button>
                    <button onclick="handleDeleteProduct(${product.id})" class="btn button">Xoá</button>
                </div>
            </div>
        `;
    });
tabProductBlock.innerHTML = htmls.join("");

}

// -------------------- Filter theo loại --------------------
document.querySelectorAll('.category-card').forEach(function (card) {
    const alt = card.querySelector('img')?.alt;
    giamgia = 0;
    if (!alt) return;
    card.addEventListener('click', function () {
        if (alt.includes("Điện thoại")) type = "phone";
        else if (alt.includes("Laptop")) type = "laptop";
        else if (alt.includes("Máy tính bảng")) type = "tablet";
        else if (alt.includes("Phụ kiện")) type = "phukien";
        fetchProducts(type);
    });
});

// -------------------- Add Product --------------------
const btnAddProduct = document.querySelector("#products__add-btn");
const infoAddProduct = document.querySelector(".products__add-info");

let attrIndex = document.querySelectorAll('.attribute-row').length;
let imgIndex = document.querySelectorAll('.image-row').length;

// Thêm thuộc tính động
document.getElementById('add-attribute-btn').onclick = function () {
    
    const attrDiv = document.createElement('div');
    attrDiv.className = 'attribute-row';
    attrDiv.innerHTML = `
        <input type="text" placeholder="Tên thuộc tính" class="attr-key input" />
        <input type="text" placeholder="Giá trị" class="attr-value input" />
        <input type="text" placeholder="Loại cấu hình" class="attr-type input" />
        <button type="button" class="remove-attr btn btn-danger btn-sm">X</button>
    `;
    document.getElementById('attributes').insertBefore(attrDiv, this);
    attrDiv.querySelector('.remove-attr').onclick = function () { attrDiv.remove(); attrIndex--; };
    attrIndex++;
};

// Thêm ảnh động
document.getElementById('add-image-btn').onclick = function () {
    const imagesDiv = document.getElementById('images');
    const imgDiv = document.createElement('div');
    imgDiv.className = 'image-row';
    imgDiv.innerHTML = `
        <input type="text" placeholder="URL ảnh" class="image-input input" />
        <button type="button" class="remove-img btn btn-danger btn-sm">X</button>
    `;
    imagesDiv.insertBefore(imgDiv, this);
    imgDiv.querySelector('.remove-img').onclick = function () { imgDiv.remove(); imgIndex--; };
    imgIndex++;
};

// Hiển thị form add product
btnAddProduct.onclick = function () {
    document.getElementById('productForm').reset();
    document.getElementById('overlay').classList.add('active');
    infoAddProduct.classList.toggle("active");
};

// Submit thêm sản phẩm
document.getElementById('addBtn').onclick = async function (e) {
    e.preventDefault();
    const name = document.getElementById('productName').value;
    const phanloai = document.getElementById('productType').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const brand = document.getElementById('productBrand').value;
    const release_date = document.getElementById('productReleaseDate').value;
    const thumb = document.getElementById('productThumb').value;
    const main_image = document.getElementById('productMainImage').value;

    const attributes = Array.from(document.querySelectorAll('.attribute-row')).map(row => ({
        key: row.querySelector('.attr-key')?.value || '',
        value: row.querySelector('.attr-value')?.value || '',
        loai_cau_hinh: row.querySelector('.attr-type')?.value || ''
    }));

    const images = Array.from(document.querySelectorAll('.image-row')).map(row => ({
        img: row.querySelector('.image-input')?.value || ''
    }));

    const percent_abs = document.querySelector('input[name="promotion.percent_abs"]')?.value;
    const start_time = document.querySelector('input[name="promotion.start_time"]')?.value;
    const end_time = document.querySelector('input[name="promotion.end_time"]')?.value;

    let promotion = null;
    if (percent_abs && start_time && end_time) {
        promotion = {
            percent_abs: parseFloat(percent_abs),
            start_time: new Date(start_time).toISOString(),
            end_time: new Date(end_time).toISOString()
        };
    }

    const payload = { name, phanloai, price, brand, release_date, thumb, main_image, attributes, images, promotion };

    try {
        const response = await fetch('http://127.0.0.1:8000/product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            showMessage('Thêm sản phẩm thất bại!', "error");
            return;
        }
        const data = await response.json();
        showMessage('Thêm sản phẩm thành công! ID: ' + data.product_id, "success");

        // Reset form
        document.getElementById('productForm').reset();
        

        fetchProducts(type);
    } catch (error) {
        console.error('Lỗi khi thêm sản phẩm:', error);
        showMessage('Có lỗi khi thêm sản phẩm!', "error");
    }
};


// -------------------- Delete product --------------------
window.handleDeleteProduct = async function (id) {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
        try {
            const response = await fetch(`http://127.0.0.1:8000/product?product_id=${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                showMessage('Xóa sản phẩm thất bại!', "error");
                return;
            }
            showMessage('Xóa sản phẩm thành công!', "success");
            fetchProducts(type);
        } catch (error) {
            console.error('Lỗi khi xóa sản phẩm:', error);
            showMessage('Có lỗi khi xóa sản phẩm!', "error");
        }
    }
};

// -------------------- Update product --------------------
window.handleUpdateProduct = async function (id) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/product_id?id=${id}`);
        if (!response.ok) throw new Error("Không lấy được sản phẩm");
        const product = await response.json();
        // Xóa tất cả các dòng thuộc tính, chỉ giữ lại dòng đầu tiên
        document.querySelectorAll('.attribute-row').forEach((row, idx) => { if (idx > 0) row.remove(); });
        // Xóa tất cả các dòng ảnh, chỉ giữ lại dòng đầu tiên
        document.querySelectorAll('.image-row').forEach((row, idx) => { if (idx > 0) row.remove(); });
        infoAddProduct.classList.add("active");
        document.getElementById('overlay').classList.add('active');
        document.getElementById('productName').value = product.name;
        document.getElementById('productType').value = product.phanloai;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productBrand').value = product.brand;
        document.getElementById('productReleaseDate').value = product.release_date;
        document.getElementById('productThumb').value = product.thumb;
        document.getElementById('productMainImage').value = product.main_image;

        // Reset attributes
        document.querySelectorAll('.attribute-row').forEach((row, idx) => { if (idx > 0) row.remove(); });
        product.attributes?.forEach((attr, idx) => {
            if (idx === 0) {
                const firstRow = document.querySelector('.attribute-row');
                firstRow.querySelector('.attr-key').value = attr.key;
                firstRow.querySelector('.attr-value').value = attr.value;
                firstRow.querySelector('.attr-type').value = attr.loai_cau_hinh;
                firstRow.querySelector('.remove-attr').onclick = () => firstRow.remove();
            } else {
                const attrDiv = document.createElement('div');
                attrDiv.className = 'attribute-row';
                attrDiv.innerHTML = `
                    <input type="text" class="attr-key input" value="${attr.key}" />
                    <input type="text" class="attr-value input" value="${attr.value}" />
                    <input type="text" class="attr-type input" value="${attr.loai_cau_hinh}" />
                    <button type="button" class="remove-attr btn btn-danger btn-sm">X</button>
                `;
                document.getElementById('attributes').insertBefore(attrDiv, document.getElementById('add-attribute-btn'));
                attrDiv.querySelector('.remove-attr').onclick = () => attrDiv.remove();
            }
        });

        // Reset images
        document.querySelectorAll('.image-row').forEach((row, idx) => { if (idx > 0) row.remove(); });
        product.images?.forEach((img, idx) => {
            if (idx === 0) {
                const firstRow = document.querySelector('.image-row');
                firstRow.querySelector('.image-input').value = img.img;
                firstRow.querySelector('.remove-img').onclick = () => firstRow.remove();
            } else {
                const imgDiv = document.createElement('div');
                imgDiv.className = 'image-row';
                imgDiv.innerHTML = `
                    <input type="text" class="image-input input" value="${img.img}" />
                    <button type="button" class="remove-img btn btn-danger btn-sm">X</button>
                `;
                document.getElementById('images').insertBefore(imgDiv, document.getElementById('add-image-btn'));
                imgDiv.querySelector('.remove-img').onclick = () => imgDiv.remove();
            }
        });

        const promoPercent = document.querySelector('input[name="promotion.percent_abs"]');
        const promoStart = document.querySelector('input[name="promotion.start_time"]');
        const promoEnd = document.querySelector('input[name="promotion.end_time"]');

        if (product.promotion) {
            promoPercent.value = product.promotion.percent_abs ?? '';
            promoStart.value = product.promotion.start_time?.slice(0, 16) ?? '';
            promoEnd.value = product.promotion.end_time?.slice(0, 16) ?? '';
        } else {
            promoPercent.value = '';
            promoStart.value = '';
            promoEnd.value = '';
        }

        const btn = document.getElementById('addBtn');
        btn.textContent = "Cập nhật";
        btn.onclick = async function (e) {
            e.preventDefault();
            await updateProduct(id);
        };
        

    } catch (error) {
        console.error("Lỗi khi load sản phẩm:", error);
        showMessage("Không tải được dữ liệu sản phẩm!", "error");
    }
    
};

async function updateProduct(id) {
    document.getElementById('overlay').classList.remove('active');
    const name = document.getElementById('productName').value;
    const phanloai = document.getElementById('productType').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const brand = document.getElementById('productBrand').value;
    const release_date = document.getElementById('productReleaseDate').value;
    const thumb = document.getElementById('productThumb').value;
    const main_image = document.getElementById('productMainImage').value;

    const attributes = Array.from(document.querySelectorAll('.attribute-row')).map(row => ({
        key: row.querySelector('.attr-key')?.value || '',
        value: row.querySelector('.attr-value')?.value || '',
        loai_cau_hinh: row.querySelector('.attr-type')?.value || ''
    }));

    const images = Array.from(document.querySelectorAll('.image-row')).map(row => ({
        img: row.querySelector('.image-input')?.value || ''
    }));

    const percent_abs = document.querySelector('input[name="promotion.percent_abs"]')?.value;
    const start_time = document.querySelector('input[name="promotion.start_time"]')?.value;
    const end_time = document.querySelector('input[name="promotion.end_time"]')?.value;

    let promotion = null;
    if (percent_abs && start_time && end_time) {
        promotion = {
            percent_abs: parseFloat(percent_abs),
            start_time: new Date(start_time).toISOString(),
            end_time: new Date(end_time).toISOString()
        };
    }

    const payload = { name, phanloai, price, brand, release_date, thumb, main_image, attributes, images, promotion };

    try {
        const response = await fetch(`http://127.0.0.1:8000/product/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            showMessage("Cập nhật sản phẩm thất bại!", "error");
            return;
        }
        showMessage("Cập nhật sản phẩm thành công!", "success");
        fetchProducts(type);

        document.getElementById('productForm').reset();
        document.getElementById('addBtn').textContent = "Thêm";
        // document.getElementById('addBtn').onclick = addProductHandler;
        infoAddProduct.classList.remove("active");

    } catch (error) {
        console.error("Lỗi khi cập nhật sản phẩm:", error);
        showMessage("Có lỗi khi cập nhật sản phẩm!", "error");
    }
}


// Mở form khi nhấn nút "Thêm Sản Phẩm"
document.getElementById('products__add-btn').onclick = function () {
    document.getElementById('addBtn').textContent = "Thêm"
    document.getElementById('overlay').classList.add('active');
    document.querySelector('.products__add-info.form').classList.add('active');
    // Xóa tất cả các dòng thuộc tính, chỉ giữ lại dòng đầu tiên
    document.querySelectorAll('.attribute-row').forEach((row, idx) => { if (idx > 0) row.remove(); });
    // Xóa tất cả các dòng ảnh, chỉ giữ lại dòng đầu tiên
    document.querySelectorAll('.image-row').forEach((row, idx) => { if (idx > 0) row.remove(); });
};

// Đóng form khi nhấn nút đóng
document.querySelector('#overlay .close-btn').onclick = function() {
    document.getElementById('overlay').classList.remove('active');
    document.querySelector('.products__add-info.form').classList.remove('active');
    document.getElementById('productForm').reset();
};

// Đóng form khi click ra ngoài form
document.getElementById('overlay').onclick = function(e) {
    if (e.target === this) {
        this.classList.remove('active');
        document.querySelector('.products__add-info.form').classList.remove('active');
        document.getElementById('productForm').reset();
    }
};

function createProductForm() {
    const formHtml = `
        <form class="products__add-info form" id="productForm">
            <h3 class="mb-3">Thêm Sản Phẩm</h3>
            <label for="productName" class="label">Tên Sản Phẩm</label>
            <input type="text" id="productName" name="name" required class="input" />
            <label for="productType" class="label">Loại Sản Phẩm</label>
            <select name="phanloai" id="productType" class="select" required>
                <option selected disabled>Chọn</option>
                <option value="phone">Phone</option>
                <option value="laptop">Laptop</option>
                <option value="phukien">Phụ kiện</option>
            </select>
            <label for="productPrice" class="label">Giá</label>
            <input type="number" id="productPrice" name="price" required class="input" min="0" />
            <label for="productBrand" class="label">Thương hiệu</label>
            <input type="text" id="productBrand" name="brand" class="input" />
            <label for="productReleaseDate" class="label">Ngày ra mắt</label>
            <input type="text" id="productReleaseDate" name="release_date" class="input" />
            <label for="productThumb" class="label">Ảnh đại diện</label>
            <input type="text" id="productThumb" name="thumb" required class="input" />
            <label for="productMainImage" class="label">Ảnh chính</label>
            <input type="text" id="productMainImage" name="main_image" class="input" />
            <div id="attributes" class="mb-3">
                <label class="label">Thuộc tính sản phẩm</label>
                <div class="attribute-row d-flex gap-2 mb-2">
                    <input type="text" placeholder="Tên thuộc tính" class="attr-key input" />
                    <input type="text" placeholder="Giá trị" class="attr-value input" />
                    <input type="text" placeholder="Loại cấu hình" class="attr-type input" />
                    <button type="button" class="remove-attr btn btn-danger btn-sm">X</button>
                </div>
                <button type="button" id="add-attribute-btn" class="btn btn-success btn-sm mt-2">Thêm thuộc tính</button>
            </div>
            <div id="images" class="mb-3">
                <label class="label">Ảnh sản phẩm</label>
                <div class="image-row d-flex gap-2 mb-2">
                    <input type="text" placeholder="URL ảnh" class="image-input input" />
                    <button type="button" class="remove-img btn btn-danger btn-sm">X</button>
                </div>
                <button type="button" id="add-image-btn" class="btn btn-success btn-sm mt-2">Thêm ảnh</button>
            </div>
            <div class="mb-3">
                <label class="label">Khuyến mãi (%)</label>
                <input type="number" name="promotion.percent_abs" class="input" min="0" max="100" />
                <label class="label">Ngày bắt đầu khuyến mãi</label>
                <input type="datetime-local" name="promotion.start_time" class="input" />
                <label class="label">Ngày kết thúc khuyến mãi</label>
                <input type="datetime-local" name="promotion.end_time" class="input" />
            </div>
            <button class="btn btn-lg btn-info button" id="addBtn">Thêm</button>
            <div id="message"></div>
        </form>
    `;
    return formHtml;
}

// Khi mở overlay, tạo lại form:
function showProductForm() {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = '<span class="close-btn">&times;</span>' + createProductForm();
    overlay.classList.add('active');
    // Gán lại sự kiện cho nút đóng
    overlay.querySelector('.close-btn').onclick = function() {
        overlay.classList.remove('active');
        overlay.innerHTML = '';
    };
    // Gán lại các sự kiện cho form (thêm thuộc tính, thêm ảnh, submit, ...)
}



