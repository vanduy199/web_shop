const API_URL = "http://127.0.0.1:8000"; // URL API Backend

document.addEventListener('DOMContentLoaded', () => {
    // Lấy form theo ID đã sửa lỗi trong HTML
    const form = document.getElementById('support-form');
    const submitButton = form?.querySelector('button[type="submit"]');
    const feedbackSpan = document.getElementById('support-feedback');

    if (!form) {
        console.error("Lỗi: Không tìm thấy form #support-form.");
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Tắt nút submit và hiển thị trạng thái loading
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerText = "Đang gửi...";
        }
        
        // Lấy Token từ Local Storage (Giả định token được lưu tại đây)
        const accessToken = localStorage.getItem('access_token');
        
        // Chuẩn bị Headers
        const headers = {};

        if (accessToken) {
            // Nếu có Token, thêm Header Authorization
            headers['Authorization'] = `Bearer ${accessToken}`;
            console.log("Token added to Authorization Header.");
        } else {
            console.log("Gửi yêu cầu ẩn danh (Không có token).");
        }


        // Tạo đối tượng FormData: Tự động lấy tất cả các trường có thuộc tính NAME
        const formData = new FormData(form);

        // --- Xử lý File Đính kèm (Tối ưu hóa) ---
        const fileInput = document.getElementById('support-file');
        
        // XÓA trường file rỗng tự động thêm vào từ HTML (nếu người dùng không chọn file)
        formData.delete('support-file'); 
        
        if (fileInput && fileInput.files.length > 0) {
            // THÊM file thực tế vào nếu có
            formData.append('support-file', fileInput.files[0], fileInput.files[0].name);
        }

        try {
            // Gọi API Backend: POST /api/support/submit
            const response = await fetch(`${API_URL}/api/support/submit`, {
                method: 'POST',
                headers: headers, // Thêm Authorization Header vào request
                body: formData 
            });

            const data = await response.json();

            if (response.ok) {
                // Xử lý thành công (201 Created)
                if (feedbackSpan) {
                    feedbackSpan.innerText = data.message || "Đã gửi thành công!";
                    feedbackSpan.style.display = 'inline';
                    setTimeout(() => (feedbackSpan.style.display = 'none'), 4000);
                }
                form.reset(); // Xóa form
            } else {
                // Xử lý lỗi từ Backend (400, 401, 422, 500,...)
                let errorMessage = data.message || data.detail || "Đã xảy ra lỗi trong quá trình xử lý yêu cầu.";
                
                // Xử lý lỗi 401 cụ thể hơn nếu không gửi được token
                if (response.status === 401) {
                    errorMessage = "Lỗi xác thực. Vui lòng đăng nhập lại.";
                } else if (Array.isArray(data.detail) && data.detail.length > 0) {
                    // Xử lý lỗi validation chi tiết hơn
                    const validationError = data.detail[0];
                    const fieldName = validationError.loc[validationError.loc.length - 1];
                    errorMessage = `Thiếu trường '${fieldName}'. Vui lòng nhập đầy đủ.`;
                }
                
                alert(`Lỗi Gửi Yêu Cầu: ${errorMessage}`);
                console.error("API Error:", data);
            }
        } catch (error) {
            // Xử lý lỗi kết nối mạng
            alert("⚠️ Lỗi kết nối. Không thể gửi yêu cầu đến máy chủ.");
            console.error("Fetch Error:", error);
        } finally {
            // Khôi phục trạng thái nút
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerText = "Gửi yêu cầu";
            }
        }
    });
});
