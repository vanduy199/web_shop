// ==================== CẤU HÌNH ====================
const reviewsTbody = document.querySelector(".reviews-management__content");
const REVIEWS_API = "http://127.0.0.1:8000/reviews/all_reviews";
const PRODUCTS_API = "http://127.0.0.1:8000/products";
const USERS_API = "http://127.0.0.1:8000/users";

let reviewsData = [];
let productsMap = {};
let usersMap = {};

// ==================== LOAD TẤT CẢ REVIEWS ====================
async function loadAllReviews() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            reviewsTbody.innerHTML = `
                <tr><td colspan="8" style="text-align:center;color:red;">
                    Vui lòng đăng nhập lại
                </td></tr>`;
            return;
        }

        const res = await fetch(REVIEWS_API, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) throw new Error("Không thể tải danh sách reviews");
        reviewsData = await res.json();
        
        // Load thông tin sản phẩm và người dùng
        await loadProductsAndUsers();
        
        renderReviews(reviewsData);

    } catch (err) {
        console.error("Lỗi tải reviews:", err);
        reviewsTbody.innerHTML = `
            <tr><td colspan="8" style="text-align:center;color:red;">
                Không thể tải reviews. Vui lòng thử lại.
            </td></tr>`;
    }
}

// ==================== LOAD SẢN PHẨM VÀ NGƯỜI DÙNG ====================
async function loadProductsAndUsers() {
    try {
        const token = localStorage.getItem('access_token');
        
        // Load sản phẩm
        const productsRes = await fetch(PRODUCTS_API);
        if (productsRes.ok) {
            const products = await productsRes.json();
            products.forEach(p => {
                productsMap[p.id] = p.name;
            });
        }
        
        // Load người dùng (nếu có endpoint)
        try {
            const usersRes = await fetch(USERS_API, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (usersRes.ok) {
                const users = await usersRes.json();
                if (Array.isArray(users)) {
                    users.forEach(u => {
                        usersMap[u.id] = u.full_name || u.email;
                    });
                }
            }
        } catch (e) {
            console.log("Không thể load danh sách người dùng");
        }
    } catch (err) {
        console.error("Lỗi load sản phẩm/người dùng:", err);
    }
}

// ==================== HIỂN THỊ REVIEWS ====================
function renderReviews(reviews) {
    reviewsTbody.innerHTML = "";

    if (!reviews || reviews.length === 0) {
        reviewsTbody.innerHTML = `
            <tr><td colspan="8" style="text-align:center;">Không có reviews nào</td></tr>`;
        return;
    }

    reviews.forEach(review => {
        const date = new Date(review.created_at).toLocaleString("vi-VN");
        const productName = review.product_name || `Sản phẩm #${review.product_id}`;
        const userName = usersMap[review.user_id] || `User #${review.user_id}`;
        const rating = review.rating ? `${'⭐'.repeat(review.rating)} (${review.rating}/5)` : "Không có đánh giá";
        const comment = review.comment ? review.comment.substring(0, 50) + "..." : "Không có nội dung";
        const status = review.status || "Chưa trả lời";
        const statusBadge = status === "Đã trả lời" 
            ? '<span class="badge bg-success">Đã trả lời</span>' 
            : '<span class="badge bg-warning text-dark">Chưa trả lời</span>';

        const row = `
            <tr>
                <td><strong>#${review.id}</strong></td>
                <td>${productName}</td>
                <td>${userName}</td>
                <td>${rating}</td>
                <td title="${review.comment || 'N/A'}" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${comment}
                </td>
                <td>${date}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewReviewDetail(${review.id})">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    ${status === "Chưa trả lời" ? `
                        <button class="btn btn-sm btn-primary" onclick="replyReview(${review.id})">
                            <i class="fa-solid fa-reply"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
        reviewsTbody.innerHTML += row;
    });
}

// ==================== XEM CHI TIẾT REVIEW ====================
function viewReviewDetail(reviewId) {
    const review = reviewsData.find(r => r.id === reviewId);
    if (!review) return;

    const productName = review.product_name || `Sản phẩm #${review.product_id}`;
    const userName = usersMap[review.user_id] || `User #${review.user_id}`;
    const rating = review.rating ? `${'⭐'.repeat(review.rating)} (${review.rating}/5)` : "Không có đánh giá";

    alert(`
📋 Chi Tiết Review #${review.id}

👤 Người Dùng: ${userName}
🛍️ Sản Phẩm: ${productName}
⭐ Đánh Giá: ${rating}
💬 Nội Dung: ${review.comment || 'Không có nội dung'}
📅 Ngày Gửi: ${new Date(review.created_at).toLocaleString('vi-VN')}
📊 Trạng Thái: ${review.status || 'Chưa trả lời'}
    `);
}

// ==================== TRẢ LỜI REVIEW ====================
function replyReview(reviewId) {
    const reply = prompt("Nhập câu trả lời cho review này:");
    if (!reply || reply.trim() === "") return;

    const token = localStorage.getItem('access_token');
    const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');

    if (!token || !currentUser.id) {
        alert("Vui lòng đăng nhập lại");
        return;
    }

    submitReply(reviewId, reply, token, currentUser.id);
}

// ==================== GỬI TRẢ LỜI ====================
async function submitReply(parentId, comment, token, userId) {
    try {
        const res = await fetch(`http://127.0.0.1:8000/reviews/response?id_parent=${parentId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                product_id: reviewsData.find(r => r.id === parentId)?.product_id || 200,
                comment: comment
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Lỗi gửi trả lời");
        }

        alert("✅ Trả lời thành công!");
        // Reload danh sách
        loadAllReviews();

    } catch (err) {
        console.error("Lỗi gửi trả lời:", err);
        alert("❌ Lỗi: " + err.message);
    }
}

// ==================== KHỞI TẠO KHI TRANG TẢI ====================
document.addEventListener('DOMContentLoaded', function() {
    // Load reviews khi click vào menu Reviews
    const reviewsMenuItem = document.querySelector('[data-target="reviews-pane"]');
    if (reviewsMenuItem) {
        reviewsMenuItem.addEventListener('click', loadAllReviews);
    }
});
