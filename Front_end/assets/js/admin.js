const token = localStorage.getItem("access_token");
(async () => {
    if (token) {
        try {
            const response = await fetch('http://127.0.0.1:8000/users/users/me', {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const user = await response.json();
                if ((user.role || '').toString().toLowerCase() !== 'admin') {
                    alert('Xin lỗi, trang này chỉ dành cho Quản trị viên!');
                    window.location.href = "../index.html";
                }
            } else {
                alert("Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
                window.location.href = "../login.html";
            }
        } catch (error) {
            console.error("Lỗi kết nối đến server:", error);
            alert("Không thể kết nối tới máy chủ. Vui lòng thử lại sau.");
        }
    } else {
        alert("Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");
        window.location.href = "../login.html";
    }
})();

// -------------------- Hàm hiển thị thông báo --------------------
function showMessage(msg, type = "success") {
    const msgBox = document.getElementById("message");
    if (!msgBox) return;
    msgBox.textContent = msg;
    msgBox.className = type === "success" ? "msg-success" : type === "info" ? "msg-info" : "msg-error";
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

        // Nếu tab Khách Hàng được bật, tải danh sách user
        if (pane && pane.classList.contains('customers-management')) {
            loadCustomers();
        }
    };
});
// --- Handler riêng cho menu Hỗ Trợ User (không ảnh hưởng menu khác) ---
(function () {
  const link = document.querySelector('.nav__item[data-target="support-pane"] .nav__link');
  if (!link) return;

  link.addEventListener("click", (e) => {
    e.preventDefault();

    // Ẩn pane hiện tại, bật pane Hỗ Trợ
    document.querySelector(".item-pane.active")?.classList.remove("active");
    document.getElementById("support-pane")?.classList.add("active");

    // Toggle active ở menu
    document.querySelector(".nav__link.active")?.classList.remove("active");
    link.classList.add("active");

    // Cập nhật tiêu đề
    if (typeof getTitlePage === "function") getTitlePage(link);

    // Báo cho support-admin.js để khởi tạo UI (nếu cần)
    window.dispatchEvent(new CustomEvent("pane:activated", { detail: { id: "support-pane" } }));
  });
})();

// -------------------- Products --------------------
let allProducts = []; // Lưu tất cả sản phẩm gốc theo type
let currentFilter = null; // Lưu filter hiện tại (brand hoặc subcategory)
let type = null;
let giamgia = 0;
let isUpdating = false;
let updatingProductId = null;

async function fetchProducts(type) {
    try {
        showMessage("Đang tải sản phẩm...", "info");
        document.getElementById('products__add-btn').disabled = true;
        let url = "http://127.0.0.1:8000/api/abs?show_abs=true";
        if (type) url += "&type=" + type;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        allProducts = data.show_product; // Lưu dữ liệu gốc
        console.log(data)
        applyFiltersAndRender();
        renderSubFilters(type);
        showMessage("Tải sản phẩm thành công!", "success");
    } catch (error) {
        console.error("Error fetching products:", error);
        showMessage("Không tải được sản phẩm!", "error");
    } finally {
        document.getElementById('products__add-btn').disabled = false;
    }
}

// -------------------- Áp dụng bộ lọc và render --------------------
function applyFiltersAndRender() {
    let filteredProducts = [...allProducts];

    // Lọc theo giamgia
    if (giamgia === -1) {
        filteredProducts = filteredProducts.filter(product => product.percent_abs > 0);
    } else if (giamgia === 1) {
        filteredProducts = filteredProducts.filter(product => product.percent_abs === 0);
    }

    // Lọc theo filter con (brand hoặc subcategory)
    if (currentFilter) {
        if (type === 'phukien') {
            filteredProducts = filteredProducts.filter(product => product.phanloai === currentFilter);
        } else {
            filteredProducts = filteredProducts.filter(product => product.brand === currentFilter);
        }
    }

    renderProducts(filteredProducts);
}

// -------------------- Render sub-filters --------------------
function renderSubFilters(type) {
    const subFiltersDiv = document.getElementById('sub-filters');
    subFiltersDiv.innerHTML = '';

    if (!type) return;

    let html = '<h4 class="mb-3">Lọc theo: </h4><div class="d-flex flex-wrap">';

    if (type === 'phukien') {
        // Hardcode các subcategory cho phụ kiện
        const phanloai = [
            { name: 'Sạc dự phòng', value: 'pinduphong' },
            { name: 'Cáp sạc', value: 'capsac' },
            { name: 'Tai nghe', value: 'tainghe' },
            { name: 'Flycam', value: 'flycam' } // Hoặc 'dron' nếu subcategory là 'dron'
        ];

        phanloai.forEach(sub => {
            html += `<button class="btn btn-outline-primary m-1 sub-filter-btn" data-value="${sub.value}">${sub.name}</button>`;
        });
    } else if (['phone', 'laptop', 'tablet'].includes(type)) {
        // Lấy unique brands từ allProducts
        const uniqueBrands = [...new Set(allProducts.map(p => p.brand).filter(b => b))].sort();
        html += `<button class="btn btn-outline-primary m-1 sub-filter-btn" data-value="">Tất cả</button>`;
        uniqueBrands.forEach(brand => {
            html += `<button class="btn btn-outline-primary m-1 sub-filter-btn" data-value="${brand}">${brand}</button>`;
        });
    }

    html += '</div>';
    subFiltersDiv.innerHTML = html;

    // Thêm sự kiện click cho các button sub-filter
    document.querySelectorAll('.sub-filter-btn').forEach(btn => {
        btn.onclick = function () {
            currentFilter = this.dataset.value || null;
            applyFiltersAndRender();
        };
    });
}

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
    if (!alt) return;
    card.addEventListener('click', function () {
        giamgia = 0;
        currentFilter = null;
        if (alt.includes("Điện thoại")) type = "phone";
        else if (alt.includes("Laptop")) type = "laptop";
        else if (alt.includes("Máy tính bảng")) type = "tablet";
        else if (alt.includes("Phụ kiện")) type = "phukien";
        fetchProducts(type);
    });
});

// -------------------- Buttons giamgia --------------------
document.getElementById('products__abs-btn').onclick = function () {
    giamgia = -1;
    applyFiltersAndRender();
};
document.getElementById('products__noabs-btn').onclick = function () {
    giamgia = 1;
    applyFiltersAndRender();
};
// Lấy tất cả sản phẩm lúc load page
fetchProducts(type);

// ====================== QUẢN LÝ KHÁCH HÀNG (ADMIN) ======================
async function loadCustomers() {
    const tbody = document.getElementById('customers-table-body');
    const empty = document.getElementById('customers-empty');
    const sortSelect = document.getElementById('users-sort-by');
    const orderSelect = document.getElementById('users-order');
    if (!tbody) return;

    const sort_by = sortSelect ? sortSelect.value : 'name';
    const order = orderSelect ? orderSelect.value : 'asc';

    tbody.innerHTML = '<tr><td colspan="6">Đang tải...</td></tr>';
    empty && (empty.style.display = 'none');
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://127.0.0.1:8000/users/?sort_by=${encodeURIComponent(sort_by)}&order=${encodeURIComponent(order)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            let msg = `HTTP ${res.status}`;
            try { const j = await res.json(); if (j?.detail) msg = j.detail; } catch {}
            throw new Error(msg);
        }
        const users = await res.json();
        if (!Array.isArray(users) || users.length === 0) {
            tbody.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        const rows = users.map(u => `
            <tr>
                <td>${u.id ?? ''}</td>
                <td>${(u.full_name || u.username || '').toString()}</td>
                <td>${u.phone || ''}</td>
                <td>${u.email || ''}</td>
                <td>${u.role || ''}</td>
                <td>${u.created_at ? new Date(u.created_at).toLocaleString() : ''}</td>
                <td>${typeof u.orders_count === 'number' ? u.orders_count : (u.orders_count ? Number(u.orders_count) : 0)}</td>
            </tr>
        `);
        tbody.innerHTML = rows.join('');
    } catch (err) {
        tbody.innerHTML = '';
        showMessage('Không tải được danh sách khách hàng: ' + (err.message || err), 'error');
        empty && (empty.style.display = 'block');
    }
}

// Sự kiện điều khiển sort
document.getElementById('users-refresh')?.addEventListener('click', () => loadCustomers());
document.getElementById('users-sort-by')?.addEventListener('change', () => loadCustomers());
document.getElementById('users-order')?.addEventListener('change', () => loadCustomers());

// -------------------- Add/Update Product Form Management --------------------
const btnAddProduct = document.querySelector("#products__add-btn");
const infoAddProduct = document.querySelector(".products__add-info");

btnAddProduct.onclick = function () {
    resetForm();
    document.getElementById('overlay').classList.add('active');
    infoAddProduct.classList.add("active");
};

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
    attrDiv.querySelector('.remove-attr').onclick = function () { attrDiv.remove(); };
};

// Thêm ảnh động
document.getElementById('add-image-btn').onclick = function () {
    const imgDiv = document.createElement('div');
    imgDiv.className = 'image-row';
    imgDiv.innerHTML = `
        <input type="text" placeholder="URL ảnh" class="image-input input" />
        <button type="button" class="remove-img btn btn-danger btn-sm">X</button>
    `;
    document.getElementById('images').insertBefore(imgDiv, this);
    imgDiv.querySelector('.remove-img').onclick = function () { imgDiv.remove(); };
};

// Submit thêm/cập nhật sản phẩm
document.getElementById('addBtn').onclick = async function (e) {
    e.preventDefault();
    if (isUpdating) {
        await updateProduct(updatingProductId);
    } else {
        await addProduct();
    }
};

async function addProduct() {
    const formData = collectFormData();
    if (!validatePayload(formData)) return;
    try {
        const token = localStorage.getItem("access_token");
        showMessage("Đang thêm sản phẩm...", "info");
        const response = await fetch('http://127.0.0.1:8000/api/product', {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        showMessage('Thêm sản phẩm thành công! ID: ' + data.product_id, "success");
        resetForm();
        infoAddProduct.classList.remove("active");
        document.getElementById('overlay').classList.remove('active');
        fetchProducts(type);
    } catch (error) {
        console.error('Lỗi khi thêm sản phẩm:', error);
        showMessage(`Có lỗi khi thêm sản phẩm: ${error.message}`, "error");
    }
}

async function updateProduct(id) {
    const formData = collectFormData();
    if (!validatePayload(formData)) return;
    try {
        const token = localStorage.getItem("access_token");
        showMessage("Đang cập nhật sản phẩm...", "info");
        const response = await fetch(`http://127.0.0.1:8000/api/product/${id}`, {
            method: 'PUT',
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
        }
        showMessage("Cập nhật sản phẩm thành công!", "success");
        resetForm();
        infoAddProduct.classList.remove("active");
        document.getElementById('overlay').classList.remove('active');
        fetchProducts(type);
    } catch (error) {
        console.error("Lỗi khi cập nhật sản phẩm:", error);
        showMessage(`Có lỗi khi cập nhật sản phẩm: ${error.message}`, "error");
    }
}

// -------------------- Delete product --------------------
window.handleDeleteProduct = async function (id) {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
        try {
            const token = localStorage.getItem("access_token");
            showMessage("Đang xóa sản phẩm...", "info");
            const response = await fetch(`http://127.0.0.1:8000/api/product?product_id=${id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            },
                method: 'DELETE'
            });
            if (!response.ok) {
                if (response.status === 404) {
                    showMessage("Sản phẩm không tồn tại!", "error");
                    return;
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            showMessage('Xóa sản phẩm thành công!', "success");
            fetchProducts(type);
        } catch (error) {
            console.error('Lỗi khi xóa sản phẩm:', error);
            showMessage(`Có lỗi khi xóa sản phẩm: ${error.message}`, "error");
        }
    }
};

// -------------------- Update product --------------------
window.handleUpdateProduct = async function (id) {
    try {
        showMessage("Đang tải dữ liệu sản phẩm...", "info");
        const response = await fetch(`http://127.0.0.1:8000/api/product_id?id=${id}`);
        if (!response.ok) {
            if (response.status === 404) {
                showMessage("Sản phẩm không tồn tại!", "error");
                return;
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const product = await response.json();
        // if (!product || !product.id) {
        //     showMessage("Dữ liệu sản phẩm không hợp lệ!", "error");
        //     return;
        // }
        isUpdating = true;
        updatingProductId = id;
        document.getElementById('addBtn').textContent = "Cập nhật";
        fillFormWithProductData(product);
        document.getElementById('overlay').classList.add('active');
        infoAddProduct.classList.add("active");
    } catch (error) {
        console.error("Lỗi khi load sản phẩm:", error);
        showMessage(`Không tải được dữ liệu sản phẩm: ${error.message}`, "error");
    }
};

// -------------------- Helper Functions --------------------
// -------------------- Helper Functions --------------------
function collectFormData() {
    const formData = new FormData();
    
    // Lấy các trường text thông thường
    const name = document.getElementById('productName').value;
    const phanloai = document.getElementById('productType').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const brand = document.getElementById('productBrand').value;
    const release_date = document.getElementById('productReleaseDate').value;
    
    // Thêm vào FormData
    formData.append('name', name);
    formData.append('phanloai', phanloai);
    formData.append('price', price);
    formData.append('brand', brand);
    formData.append('release_date', release_date);
    
    // Lấy ảnh đại diện (file upload)
    const thumbInput = document.getElementById('productThumb');
    if (thumbInput?.files?.[0]) {
        formData.append('thumb', thumbInput.files[0]);
    }
    
    // Lấy ảnh chính (file upload)
    const mainImageInput = document.getElementById('productMainImage');
    if (mainImageInput?.files?.[0]) {
        formData.append('main_image', mainImageInput.files[0]);
    }
    
    // Xử lý attributes
    const attributes = Array.from(document.querySelectorAll('.attribute-row')).map(row => ({
        key: row.querySelector('.attr-key')?.value || '',
        value: row.querySelector('.attr-value')?.value || '',
        loai_cau_hinh: row.querySelector('.attr-type')?.value || ''
    }));
    formData.append('attributes', JSON.stringify(attributes));
    
    // Xử lý images (file hoặc URL)
    const imageRows = Array.from(document.querySelectorAll('.image-row'));
    const imageUrls = [];
    
    imageRows.forEach(row => {
        const fileInput = row.querySelector('.image-input');
        
        if (fileInput?.files?.[0]) {
            // Là file - gửi trực tiếp
            formData.append('images', fileInput.files[0]);
        } else if (fileInput?.value) {
            // Là URL - thêm vào array
            imageUrls.push({ img: fileInput.value });
        }
    });
    
    // Thêm URLs dưới dạng JSON string
    if (imageUrls.length > 0) {
        formData.append('image_urls', JSON.stringify(imageUrls));
    }
    
    // Xử lý promotion
    const percent_abs = document.querySelector('input[name="promotion.percent_abs"]')?.value;
    const start_time = document.querySelector('input[name="promotion.start_time"]')?.value;
    const end_time = document.querySelector('input[name="promotion.end_time"]')?.value;
    
    if (percent_abs && start_time && end_time) {
        const promotion = {
            percent_abs: parseFloat(percent_abs),
            start_time: new Date(start_time).toISOString(),
            end_time: new Date(end_time).toISOString()
        };
        formData.append('promotion', JSON.stringify(promotion));
    }
    
    return formData;
}

function fillFormWithProductData(product) {
    document.getElementById('productName').value = product.name;
    document.getElementById('productType').value = product.phanloai;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productBrand').value = product.brand;
    document.getElementById('productReleaseDate').value = product.release_date;
    
    // File inputs không thể set value vì lý do bảo mật, chỉ clear thôi
    document.getElementById('productThumb').value = '';
    document.getElementById('productMainImage').value = '';
    
    // Nhưng hiển thị preview của ảnh hiện tại từ URL
    const thumbContainer = document.getElementById('thumbPreview');
    if (thumbContainer && product.thumb) {
        thumbContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = product.thumb;
        img.style.maxWidth = '150px';
        img.style.maxHeight = '150px';
        img.style.borderRadius = '5px';
        img.style.border = '1px solid #ddd';
        img.title = 'Ảnh hiện tại - Chọn file mới để thay đổi';
        thumbContainer.appendChild(img);
    }
    
    const mainContainer = document.getElementById('mainImagePreview');
    if (mainContainer && product.main_image) {
        mainContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = product.main_image;
        img.style.maxWidth = '150px';
        img.style.maxHeight = '150px';
        img.style.borderRadius = '5px';
        img.style.border = '1px solid #ddd';
        img.title = 'Ảnh hiện tại - Chọn file mới để thay đổi';
        mainContainer.appendChild(img);
    }

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
    
    // Clear images preview
    const imagesPreview = document.getElementById('imagesPreview');
    if (imagesPreview) {
        imagesPreview.innerHTML = '';
    }
    
    product.images?.forEach((img, idx) => {
        if (idx === 0) {
            const firstRow = document.querySelector('.image-row');
            const imageInput = firstRow.querySelector('.image-input');
            imageInput.value = img.img;
            firstRow.querySelector('.remove-img').onclick = () => firstRow.remove();
            
            // Hiển thị preview của ảnh hiện tại
            if (imagesPreview && img.img) {
                const imgEl = document.createElement('img');
                imgEl.src = img.img;
                imgEl.style.maxWidth = '100px';
                imgEl.style.maxHeight = '100px';
                imgEl.style.borderRadius = '5px';
                imgEl.style.border = '1px solid #ddd';
                imagesPreview.appendChild(imgEl);
            }
        } else {
            const imgDiv = document.createElement('div');
            imgDiv.className = 'image-row';
            imgDiv.innerHTML = `
                <input type="text" class="image-input input" value="${img.img}" />
                <button type="button" class="remove-img btn btn-danger btn-sm">X</button>
            `;
            document.getElementById('images').insertBefore(imgDiv, document.getElementById('add-image-btn'));
            imgDiv.querySelector('.remove-img').onclick = () => imgDiv.remove();
            
            // Hiển thị preview
            if (imagesPreview && img.img) {
                const imgEl = document.createElement('img');
                imgEl.src = img.img;
                imgEl.style.maxWidth = '100px';
                imgEl.style.maxHeight = '100px';
                imgEl.style.borderRadius = '5px';
                imgEl.style.border = '1px solid #ddd';
                imagesPreview.appendChild(imgEl);
            }
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
}

function resetForm() {
    document.getElementById('productForm').reset();
    document.querySelectorAll('.attribute-row').forEach((row, idx) => { if (idx > 0) row.remove(); });
    document.querySelectorAll('.image-row').forEach((row, idx) => { if (idx > 0) row.remove(); });
    isUpdating = false;
    updatingProductId = null;
    document.getElementById('addBtn').textContent = "Thêm";
}

function validatePayload(formData) {
    const name = formData.get('name');
    const phanloai = formData.get('phanloai');
    const price = parseFloat(formData.get('price'));
    const thumbFile = document.getElementById('productThumb').files[0];
    
    // Kiểm tra fields bắt buộc
    if (!name || !phanloai || isNaN(price) || price <= 0) {
        showMessage("Vui lòng điền đầy đủ thông tin bắt buộc (tên, loại, giá)!", "error");
        return false;
    }
    
    // Khi thêm mới (ADD) phải có file thumb
    // Khi cập nhật (UPDATE) không bắt buộc (vì có thể giữ ảnh cũ)
    if (!isUpdating && !thumbFile) {
        showMessage("Vui lòng chọn ảnh đại diện!", "error");
        return false;
    }
    
    return true;
}

// -------------------- Preview Image Functions --------------------
function showImagePreview(fileInput, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = ''; // Clear previous preview
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '150px';
            img.style.maxHeight = '150px';
            img.style.borderRadius = '5px';
            img.style.border = '1px solid #ddd';
            container.appendChild(img);
        };
        
        reader.readAsDataURL(file);
    }
}

function updateImageRowPreviews() {
    const imagesPreview = document.getElementById('imagesPreview');
    if (!imagesPreview) return;
    
    imagesPreview.innerHTML = ''; // Clear previous previews
    
    const imageRows = document.querySelectorAll('.image-row');
    imageRows.forEach((row, idx) => {
        const imageInput = row.querySelector('.image-input');
        
        if (imageInput.type === 'file' && imageInput.files && imageInput.files[0]) {
            const file = imageInput.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';
                img.style.borderRadius = '5px';
                img.style.border = '1px solid #ddd';
                imagesPreview.appendChild(img);
            };
            
            reader.readAsDataURL(file);
        }
    });
}

// Setup preview event listeners
document.addEventListener('DOMContentLoaded', function() {
    const thumbInput = document.getElementById('productThumb');
    const mainImageInput = document.getElementById('productMainImage');
    
    if (thumbInput) {
        thumbInput.addEventListener('change', function() {
            showImagePreview(this, 'thumbPreview');
        });
    }
    
    if (mainImageInput) {
        mainImageInput.addEventListener('change', function() {
            showImagePreview(this, 'mainImagePreview');
        });
    }
});

// -------------------- Form Close Handlers --------------------
document.querySelector('#overlay .close-btn').onclick = function() {
    document.getElementById('overlay').classList.remove('active');
    infoAddProduct.classList.remove('active');
    resetForm();
};

// Đóng form khi click ra ngoài form
document.getElementById('overlay').onclick = function(e) {
    if (e.target === this) {
        this.classList.remove('active');
        infoAddProduct.classList.remove('active');
        resetForm();
    }
};

// Tạo form nếu cần (giả sử form đã tồn tại trong HTML, nếu không thì thêm hàm createProductForm như trước)