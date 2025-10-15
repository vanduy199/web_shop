function renderUserHeader(user) {
    const userBlock = document.querySelector(".header-check");
    const userBlockMobile = document.querySelector(".header-check-mobile");

    if (!userBlock || !userBlockMobile) {
        return;
    }
    const isAdmin = (user.role || '').toString().toLowerCase() === 'admin';
    const displayName = user.full_name || user.username || user.phone || 'Tài khoản';
    const adminMenu = `
        <li class="sub-menu-admin">
            <a href="admin/index.html">
                <i class="fa-solid fa-circle-user"></i> Trang Admin
            </a>
        </li>
        <hr />`;
    const infoItems = `
        <li class="user-info"><i class="fa-regular fa-id-card"></i> ${displayName}</li>
        ${user.email ? `<li class="user-info"><i class=\"fa-regular fa-envelope\"></i> ${user.email}</li>` : ''}
        <li class="user-info"><i class="fa-solid fa-phone"></i> ${user.phone}</li>
        <hr />
        <li><a href="#" onclick="openEditInfoModal(event)"><i class="fa-regular fa-user"></i> Sửa thông tin</a></li>
        <li><a href="#" onclick="openChangePasswordModal(event)"><i class="fa-solid fa-key"></i> Đổi mật khẩu</a></li>
        <hr />
    `;
    const userHTML = `
        <div class="row header__item">
            <div class="col-3">
                <div class="fs-1 text-light">
                    <i class="fa fa-user header-icon"></i>
                </div>
            </div>
            <div class="col-9">
                <div class="col-9">
                    <strong class="subheader">${displayName}</strong>
                </div>
            </div>
            <ul class="sub-menu">
                ${isAdmin ? adminMenu : ''}
                ${infoItems}
                <li>
                    <a href="#" onclick="logout(event)">
                        <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
                    </a>
                </li>
            </ul>
        </div>`;
    
    const userMobileHTML = `
        <div class="row header__item">
            <div class="col-3">
                <div class="fs-1 text-light">
                    <i class="fa fa-user header-icon"></i>
                </div>
            </div>
            <div class="col-9">
                <strong class="subheader">${displayName}</strong>
            </div>
            <ul class="sub-menu">
                ${isAdmin ? adminMenu : ''}
                ${infoItems}
                <li>
                    <a href="#" onclick="logout(event)">
                        <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
                    </a>
                </li>
            </ul>
        </div>`;

    userBlock.innerHTML = userHTML;
    userBlockMobile.innerHTML = userMobileHTML;
}
// Simple modals for edit info and change password
function ensureModals() {
    if (!document.getElementById('modal-backdrop')) {
        const backdrop = document.createElement('div');
        backdrop.id = 'modal-backdrop';
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);display:none;z-index:1040;';
        document.body.appendChild(backdrop);
    }
    if (!document.getElementById('user-modals')) {
        const wrapper = document.createElement('div');
        wrapper.id = 'user-modals';
        wrapper.innerHTML = `
        <div id="edit-info-modal" class="simple-modal" style="display:none;position:fixed;left:50%;top:15%;transform:translateX(-50%);background:#fff;z-index:1050;width:90%;max-width:480px;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.2);">
            <div style="padding:16px 20px;border-bottom:1px solid #eee;font-weight:600;">Sửa thông tin</div>
            <div style="padding:16px 20px;">
                <div class="mb-3">
                    <label>Họ tên</label>
                    <input id="edit-fullname" class="form-control" type="text" />
                </div>
                <div class="mb-3">
                    <label>Email</label>
                    <input id="edit-email" class="form-control" type="email" />
                </div>
            </div>
            <div style="padding:12px 20px;border-top:1px solid #eee;display:flex;gap:8px;justify-content:flex-end;">
                <button class="btn btn-light" onclick="closeAllModals()">Hủy</button>
                <button class="btn btn-primary" onclick="submitEditInfo()">Lưu</button>
            </div>
        </div>
        <div id="change-password-modal" class="simple-modal" style="display:none;position:fixed;left:50%;top:15%;transform:translateX(-50%);background:#fff;z-index:1050;width:90%;max-width:480px;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.2);">
            <div style="padding:16px 20px;border-bottom:1px solid #eee;font-weight:600;">Đổi mật khẩu</div>
            <div style="padding:16px 20px;">
                <div class="mb-3">
                    <label>Mật khẩu hiện tại</label>
                    <input id="old-password" class="form-control" type="password" />
                </div>
                <div class="mb-3">
                    <label>Mật khẩu mới</label>
                    <input id="new-password" class="form-control" type="password" />
                </div>
            </div>
            <div style="padding:12px 20px;border-top:1px solid #eee;display:flex;gap:8px;justify-content:flex-end;">
                <button class="btn btn-light" onclick="closeAllModals()">Hủy</button>
                <button class="btn btn-primary" onclick="submitChangePassword()">Đổi mật khẩu</button>
            </div>
        </div>`;
        document.body.appendChild(wrapper);
    }
}

function openEditInfoModal(e){ e?.preventDefault?.(); ensureModals();
    const user = JSON.parse(localStorage.getItem('current_user')||'{}');
    document.getElementById('edit-fullname').value = user.full_name || '';
    document.getElementById('edit-email').value = user.email || '';
    document.getElementById('modal-backdrop').style.display = 'block';
    document.getElementById('edit-info-modal').style.display = 'block';
}
function openChangePasswordModal(e){ e?.preventDefault?.(); ensureModals();
    document.getElementById('modal-backdrop').style.display = 'block';
    document.getElementById('change-password-modal').style.display = 'block';
}
function closeAllModals(){
    const ids = ['modal-backdrop','edit-info-modal','change-password-modal'];
    ids.forEach(id=>{ const el = document.getElementById(id); if (el) el.style.display='none'; });
}

async function submitEditInfo(){
    const token = localStorage.getItem('access_token');
    const user = JSON.parse(localStorage.getItem('current_user')||'{}');
    if (!token || !user?.id){ alert('Vui lòng đăng nhập lại.'); return; }
    const payload = {
        full_name: document.getElementById('edit-fullname').value?.trim() || null,
        email: document.getElementById('edit-email').value?.trim() || null,
    };
    try{
        const res = await fetch(`http://127.0.0.1:8000/users/${user.id}`,{
            method:'PUT',
            headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if(!res.ok){ const err = await res.json().catch(()=>({detail:'Lỗi không xác định'})); throw new Error(err.detail||'Cập nhật thất bại'); }
        const updated = await res.json();
        localStorage.setItem('current_user', JSON.stringify(updated));
        renderUserHeader(updated);
        closeAllModals();
        alert('Cập nhật thông tin thành công');
    }catch(err){
        alert(err.message||'Cập nhật thất bại');
    }
}

async function submitChangePassword(){
    const token = localStorage.getItem('access_token');
    const user = JSON.parse(localStorage.getItem('current_user')||'{}');
    if (!token || !user?.id){ alert('Vui lòng đăng nhập lại.'); return; }
    const payload = { 
        old_password: document.getElementById('old-password').value,
        new_password: document.getElementById('new-password').value,
    };
    if (!payload.old_password || !payload.new_password){ alert('Vui lòng nhập đủ thông tin'); return; }
    try{
        const res = await fetch(`http://127.0.0.1:8000/users/${user.id}/change-password`,{
            method:'PUT',
            headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if(!res.ok){ const err = await res.json().catch(()=>({detail:'Lỗi không xác định'})); throw new Error(err.detail||'Đổi mật khẩu thất bại'); }
        closeAllModals();
        alert('Đổi mật khẩu thành công');
    }catch(err){
        alert(err.message||'Đổi mật khẩu thất bại');
    }
}
// Refresh user info from API and update header/local cache
async function refreshUserFromAPI() {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
        const response = await fetch("http://127.0.0.1:8000/users/users/me", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const user = await response.json();
            localStorage.setItem("current_user", JSON.stringify(user));
            renderUserHeader(user);
        } else {
            console.error("Token không hợp lệ. Vui lòng đăng nhập lại.");
            localStorage.removeItem("access_token");
            localStorage.removeItem("current_user");
        }
    } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
    }
}

// Initialize header: render immediately from cache, then refresh from API
async function initUserHeader() {
    // Chỉ chạy nếu header đã có trong DOM
    const headerExists = document.querySelector('.header-check') || document.querySelector('.header-check-mobile');
    if (!headerExists) return;

    const cachedUser = localStorage.getItem('current_user');
    if (cachedUser) {
        try {
            const user = JSON.parse(cachedUser);
            renderUserHeader(user);
        } catch (_) { /* ignore parse errors */ }
    }

    // Sau đó gọi API để đồng bộ thông tin mới nhất (nếu có token)
    await refreshUserFromAPI();
}

// Backward compatibility: keep old name if other code still calls it
async function checkUserLogin() {
    return refreshUserFromAPI();
}

function logout(event) {
    event.preventDefault(); 
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("current_user");
        window.location.href = "index.html";
    }
}

// Hàm login sẽ được gọi bởi Validator khi form hợp lệ
async function login() {
    // 1. Lấy dữ liệu từ form
    const phoneInput = document.getElementById("account");
    const passwordInput = document.getElementById("password");
    const notification = document.getElementById("notification");
    const contentNotification = document.getElementById("contentNotification");

    const loginData = {
        phone: phoneInput.value,
        password: passwordInput.value,
    };

    // 2. Gửi yêu cầu POST đến API
    try {
        const response = await fetch("http://127.0.0.1:8000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(loginData),
        });

        const result = await response.json();

        // 3. Xử lý kết quả trả về
        if (response.ok) {
            // Đăng nhập thành công
            localStorage.setItem("access_token", result.access_token);

            contentNotification.innerText = "Đăng nhập thành công! Đang chuyển hướng...";
            notification.style.backgroundColor = "#4CAF50"; // Màu xanh
            notification.style.display = "block";

            setTimeout(() => {
                window.location.href = "index.html";
            }, 10);

        } else {
            // Đăng nhập thất bại
            const errorMessage = result.detail || "Đã có lỗi xảy ra. Vui lòng thử lại.";
            contentNotification.innerText = errorMessage;
            notification.style.backgroundColor = "#f44336"; // Màu đỏ
            notification.style.display = "block";
        }
    } catch (error) {
        // Lỗi mạng hoặc server không phản hồi
        console.error("Login error:", error);
        contentNotification.innerText = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại!";
        notification.style.backgroundColor = "#f44336";
        notification.style.display = "block";
    }

    // Ẩn thông báo sau 5 giây
    setTimeout(() => {
        notification.style.display = "none";
    }, 5000);
}

