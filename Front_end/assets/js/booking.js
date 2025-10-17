const token = localStorage.getItem("access_token");
document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('form');
    if (form) {
        // 3. Lắng nghe sự kiện 'submit'
        form.addEventListener('submit', function(event) {
            // Ngăn chặn hành vi mặc định của form (tải lại trang)
            event.preventDefault();

            // 4. Khởi tạo đối tượng FormData để dễ dàng thu thập dữ liệu
            const formData = new FormData(form);

            // 5. Khởi tạo một đối tượng (object) JavaScript để lưu trữ dữ liệu
            const bookingData = {};

            // 6. Lặp qua các cặp key/value trong FormData
            formData.forEach((value, key) => {
                bookingData[key] = value;
            });
            products = localStorage.getItem("booked")
            console.log(products)
            bookingData['carts'] = products
            // 7. In dữ liệu ra console để kiểm tra (hoặc gửi lên server bằng Fetch API)
            console.log("Dữ liệu thông tin mua hàng:");
            console.log(bookingData);

            const url = 'http://127.0.0.1:8000/orders'; // URL mà form của bạn đã chỉ định

            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify(bookingData), // Chuyển đổi object thành chuỗi JSON
            })
            .then(response => response.json()) // Giả sử server trả về JSON
            .then(data => {
                console.log('Server trả về:', data);
                alert('Đặt hàng thành công!');
                // Có thể chuyển hướng người dùng hoặc làm gì đó khác tại đây
            })
            .catch((error) => {
                console.error('Lỗi khi gửi dữ liệu:', error);
                alert('Đặt hàng thất bại. Vui lòng thử lại.');
            });
            
        });
    }
});