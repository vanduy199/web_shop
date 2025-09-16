// -------------------- Kiểm tra quyền admin --------------------
if (localStorage.getItem("tokenLogin")) {
    const user = JSON.parse(localStorage.getItem("tokenLogin"));
    if (user.isAdmin !== true) {
        alert("Bạn không có quyền truy cập vào trang này!");
        window.location.href = "../index.html";
    }
} else {
    alert("Bạn chưa đăng nhập!");
    window.location.href = "../login.html";
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

async function fetchProducts(type=null) {
    try {
        let url = "http://127.0.0.1:8000/product";
        if(type) url += "?type=" + type;
        const response = await fetch(url);
        const data = await response.json();
        products = data;
        renderProducts(products);
    } catch (error) {
        console.error("Error fetching products:", error);
    }
}

// Lấy tất cả sản phẩm lúc load page
fetchProducts();

// -------------------- Render products --------------------
function renderProducts(products) {
    const tabProductBlock = document.querySelector("#tab-products");
    tabProductBlock.innerHTML = "";
    const htmls = products.map(product => `
        <div class="product-item product-item-${product.id}">
            <h4>${product.name}</h4>
            <img src="${product.thumb}" alt="Sản phẩm ${product.id}" class="product__media-img" />
            <div class="group-button">
                <button onclick="handleUpdateProduct(${product.id})" class="btn button">Sửa</button>
                <button onclick="handleDeleteProduct(${product.id})" class="btn button">Xoá</button>
            </div>
        </div>
    `);
    tabProductBlock.innerHTML = htmls.join("");
}

// -------------------- Filter theo loại --------------------
document.querySelectorAll('.category-card').forEach(function(card) {
    const alt = card.querySelector('img')?.alt;
    if(!alt) return;
    card.addEventListener('click', function () {
        let type = null;
        if(alt.toLowerCase().includes("điện thoại")) type = "phone";
        else if(alt.toLowerCase().includes("laptop")) type = "laptop";
        else if(alt.toLowerCase().includes("phụ kiện")) type = "phukien";
        fetchProducts(type);
    });
});

// -------------------- Add Product --------------------
const btnAddProduct = document.querySelector("#products__add-btn");
const infoAddProduct = document.querySelector(".products__add-info");

let attrIndex = document.querySelectorAll('.attribute-row').length;
let imgIndex = document.querySelectorAll('.image-row').length;

// Thêm thuộc tính động
document.getElementById('add-attribute-btn').onclick = function() {
    const attrDiv = document.createElement('div');
    attrDiv.className = 'attribute-row';
    attrDiv.innerHTML = `
        <input type="text" placeholder="Tên thuộc tính" class="attr-key input" />
        <input type="text" placeholder="Giá trị" class="attr-value input" />
        <input type="text" placeholder="Loại cấu hình" class="attr-type input" />
        <button type="button" class="remove-attr btn btn-danger btn-sm">X</button>
    `;
    document.getElementById('attributes').insertBefore(attrDiv, this);
    attrDiv.querySelector('.remove-attr').onclick = function() { attrDiv.remove(); attrIndex--; };
    attrIndex++;
};

// Thêm ảnh động
document.getElementById('add-image-btn').onclick = function() {
    const imagesDiv = document.getElementById('images');
    const imgDiv = document.createElement('div');
    imgDiv.className = 'image-row';
    imgDiv.innerHTML = `
        <input type="text" placeholder="URL ảnh" class="image-input input" />
        <button type="button" class="remove-img btn btn-danger btn-sm">X</button>
    `;
    imagesDiv.insertBefore(imgDiv, this);
    imgDiv.querySelector('.remove-img').onclick = function() { imgDiv.remove(); imgIndex--; };
    imgIndex++;
};

// Hiển thị form add product
btnAddProduct.onclick = function () {
    infoAddProduct.classList.toggle("active");
};

// Submit thêm sản phẩm
document.getElementById('addBtn').onclick = async function(e) {
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
    if(percent_abs && start_time && end_time){
        promotion = {
            percent_abs: parseFloat(percent_abs),
            start_time: new Date(start_time).toISOString(),
            end_time: new Date(end_time).toISOString()
        };
    }

    const payload = { name, phanloai, price, brand, release_date, thumb, main_image, attributes, images, promotion };

    console.log('Payload gửi lên:', payload);

    try {
        const response = await fetch('http://127.0.0.1:8000/product', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if(!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        alert('Thêm sản phẩm thành công! ID: ' + data.product_id);
        console.log('Response từ server:', data);

        // Reset form
        document.getElementById('productForm').reset();
        document.querySelectorAll('.attribute-row').forEach((row, idx) => { if(idx>0) row.remove(); });
        document.querySelectorAll('.image-row').forEach((row, idx) => { if(idx>0) row.remove(); });

        // Cập nhật lại danh sách sản phẩm
        fetchProducts();
    } catch (error) {
        console.error('Lỗi khi thêm sản phẩm:', error);
        alert('Thêm sản phẩm thất bại!');
    }
};

// -------------------- Delete product --------------------
window.handleDeleteProduct = async function(id) {
    if(confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
        try {
            const response = await fetch(`http://127.0.0.1:8000/product?product_id=${id}`, {
                method: 'DELETE'
            });
            if(!response.ok) throw new Error('Xóa thất bại');
            alert('Xóa sản phẩm thành công!');
            fetchProducts();
        } catch (error) {
            console.error('Lỗi khi xóa sản phẩm:', error);
            alert('Xóa sản phẩm thất bại!');
        }
    }
};

// -------------------- Đơn hàng --------------------
const ordersElement = document.querySelector(".orders-management");
const orders = JSON.parse(localStorage.getItem("orders")) || [];
const contentContainer = ordersElement?.querySelector(".orders-management__content");

const renderOrders = (orders) => {
    if(!contentContainer) return;
    let html = "";
    for (const order of orders) {
        order.info.createAt = new Date(order.info.createAt).toLocaleString();
        html += `
        <tr>
            <td class="text-primary mobile-none">${order.info.code}</td>
            <td>${order.info.createAt}</td>
            <td class="mobile-none">${order.info.name}</td>
            <td class="text-primary">${order.info.state}</td>
            <td class="text-primary">${order.info.payment}</td>
            <td class="text-primary mobile-none">${order.info.delivery}</td>
            <td class="text-danger">${order.info.total}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteOrder('${order.info.code}')">Xóa</button>  
            </td>
        </tr>
        <tr>
            <td colspan="8">
                <table class="table table-hover table-sm mt-3">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Sản phẩm</th>
                            <th>Ảnh</th>
                            <th>Giá</th>
                            <th>Số lượng</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderOrderItems(order.data)}
                    </tbody>
                </table>
            </td>
        </tr>`;
    }
    contentContainer.innerHTML = html;
};

const renderOrderItems = (orderItems) => {
    let html = "";
    let i = 1;
    for (const orderItem in orderItems) {
        html += `
        <tr>
            <td>${i++}</td>
            <td>${orderItems[orderItem].name}</td>
            <td><img src="${orderItems[orderItem].image}" alt="" style="width: 50px"/></td>
            <td>${orderItems[orderItem].price}₫</td>
            <td>${orderItems[orderItem].quantity}</td>
        </tr>`;
    }
    return html;
};

renderOrders(orders);

window.deleteOrder = (code) => {
    if(confirm("Bạn có chắc muốn xóa đơn hàng này?")) {
        const index = orders.findIndex(order => order.info.code === code);
        if(index >= 0){
            orders.splice(index, 1);
            localStorage.setItem("orders", JSON.stringify(orders));
            renderOrders(orders);
        }
    }
};
