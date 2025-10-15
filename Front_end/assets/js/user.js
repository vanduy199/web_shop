function renderUserHeader(user) {
    const userBlock = document.querySelector(".header-check");
    const userBlockMobile = document.querySelector(".header-check-mobile");

    if (!userBlock || !userBlockMobile) {
        return;
    }
    const isAdmin = user.role === 'admin';
    const adminMenu = `
        <li class="sub-menu-admin">
            <a href="admin">
                <i class="fa-solid fa-circle-user"></i> Trang Admin
            </a>
        </li>
        <hr />`;
    const userHTML = `
        <div class="row header__item">
            <div class="col-3">
                <div class="fs-1 text-light">
                    <i class="fa fa-user header-icon"></i>
                </div>
            </div>
            <div class="col-9">
                <div class="col-9">
                    <strong class="subheader">Tài khoản</strong>
                </div>
            </div>
            <ul class="sub-menu">
                ${isAdmin ? adminMenu : ''}
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
                <strong class="subheader">Tài khoản</strong>
            </div>
            <ul class="sub-menu">
                ${isAdmin ? adminMenu : ''}
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
async function checkUserLogin() {
    const token = localStorage.getItem("access_token");
    if (!token) {
        return;
    }
    try {
        const response = await fetch("http://127.0.0.1:8000/users/users/me", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
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

document.addEventListener('DOMContentLoaded', checkUserLogin);

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

