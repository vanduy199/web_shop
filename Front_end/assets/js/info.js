
var productId = localStorage.getItem("productId");
const API_URL = "http://127.0.0.1:8000";
const token = localStorage.getItem("access_token");
const headers = token
  ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
  : { "Content-Type": "application/json" };

let userRole = null; // Lưu role của user (admin, user, guest)

let name1 = "Samsung Galaxy S24 5G 8GB/256GB";
async function fetchProducts(id = null) {
    try {
        let url = "http://127.0.0.1:8000/api/product_id";
        if (id) url += "?id=" + id;
        const response = await fetch(url);
        const data = await response.json();
        const products = data;
        var headingInfo = document.querySelector(".info__heading");
        headingInfo.innerText = products.name;
        var breadcrumbInfo = document.querySelector(".info__heading");
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
        // add to cart
        var btnAddCart = document.querySelector(".groupbtn__cart");
        btnAddCart.onclick = function() {
            addToCart(productId, 1);
        };
        
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
fetchProducts(productId);

// Thêm sản phẩm vào giỏ hàng


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
    localStorage.setItem("point", "info");
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
const API_BASE = "http://127.0.0.1:8000/cart";

const userId = null;
async function addToCart(productId, quantity = 1) {
    try {
        console.log("Thêm vào giỏ:", productId, quantity);

        // Đảm bảo URL là /cart/ cho POST
        const res = await fetch(`${API_BASE}/`, { 
            method: "POST",
            headers: headers, 
            body: JSON.stringify({
                product_id: Number(productId),
                quantity: Number(quantity)
            }),
        });

        let data = null;
        try { data = await res.json(); } catch (e) { /* Lỗi khi phản hồi không phải JSON */ }
        if (!res.ok) {
            console.error("Thêm thất bại:", res.status, data);
            
            let errorMessage = `LỖI API ${res.status}`;
            
            errorMessage = `Thêm thất bại: ${data.detail}`;

            alert(errorMessage);
            return;
        }

        console.log("Thêm thành công:", data);
        
        if (typeof loadCart === 'function') {
            await loadCart();
        }
        
        alert("Đã thêm vào giỏ hàng!");
    } catch (err) {
        console.error("Lỗi mạng hoặc JS:", err);
        alert("Lỗi mạng hoặc lỗi JavaScript. Kiểm tra console.");
    }
}


// ✅ FIXED: Activity tracking
const API_ACTIVITY = "http://127.0.0.1:8000/activity/";


async function activity(productId) {
    try {
        // ❌ FIX 1: Kiểm tra productId
        if (!productId) {
            console.warn("No productId provided for activity tracking");
            return;
        }

        console.log("Tracking activity for product:", productId);

        // ❌ FIX 2: URL đúng - không có "/" thừa ở cuối
        const res = await fetch(API_ACTIVITY, { 
            method: "POST",
            headers: headers, 
            body: JSON.stringify({
                product_id: Number(productId),
                action: "click"
            }),
        });

        // ❌ FIX 3: Parse JSON an toàn
        let data = null;
        try { 
            data = await res.json(); 
        } catch (e) { 
            console.warn("Response is not JSON:", e);
        }

        // ❌ FIX 4: Xử lý lỗi đúng
        if (!res.ok) {
            const errorMessage = data?.detail || `HTTP ${res.status}`;
            console.error("Activity tracking failed:", errorMessage);
            // Không alert vì đây là background task, không cần thông báo user
            return;
        }

        console.log("Activity tracked successfully:", data);

    } catch (err) {
        console.error("Network or JS error in activity:", err);
        // Không alert vì đây là background task
    }
}

// ❌ FIX 5: Gọi activity sau khi DOM ready và có productId
var productId = localStorage.getItem("productId");

document.addEventListener('DOMContentLoaded', function() {
    if (productId) {
        activity(productId);
    } else {
        console.warn("No productId found in localStorage");
    }
});
async function fetchWithAuth(url, options = {}) {
  options.headers = {
    ...options.headers,
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };
  const res = await fetch(url, options);
  if (!res.ok) throw new Error("Lỗi khi gọi API");
  return res.json();
}

// Lấy danh sách bình luận
async function loadReviews() {
  try {
    const res = await fetch(`${API_URL}/reviews/?product_id=${productId}`);
    const data = await res.json();
    renderReviews(data);
  } catch (err) {
    console.error(err);
  }
}

// Gửi bình luận cha
async function sendComment() {
  const comment = document.getElementById("commentInput").value.trim();
  if (!comment) return alert("Vui lòng nhập nội dung!");

  try {
    await fetchWithAuth(`${API_URL}/reviews/`, {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        comment: comment,
        rating: null,
        id_parent: null
      })
    });
    document.getElementById("commentInput").value = "";
    loadReviews();
  } catch (err) {
    console.error("Lỗi gửi bình luận:", err);
    alert("Không thể gửi bình luận!");
  }
}

// Gửi phản hồi bình luận
async function sendReply(commentId, productIdVal) {
  const replyText = document.getElementById(`reply-${productIdVal}-${commentId}`).value.trim();
  if (!replyText) return alert("Vui lòng nhập nội dung phản hồi!");

  try {
    await fetchWithAuth(`${API_URL}/reviews/`, {
      method: "POST",
      body: JSON.stringify({
        product_id: productIdVal,
        comment: replyText,
        rating: null,
        id_parent: commentId
      })
    });
    loadReviews();
  } catch (err) {
    console.error("Lỗi gửi phản hồi:", err);
    alert("Không thể gửi phản hồi!");
  }
}

// Hiển thị danh sách bình luận
function renderReviews(reviews) {
  const container = document.getElementById("reviewsContainer");
  if (!container) return;
  container.innerHTML = "";

  reviews.forEach(rv => {
    const div = document.createElement("div");
    div.className = "review";
    
    // Tạo sao display
    const starDisplay = Array(5).fill('').map((_, i) => {
      return `<i class="fa-${i < (rv.rating || 0) ? 'solid' : 'regular'} fa-star" style="color: #f39c12; font-size: 14px;"></i>`;
    }).join('');
    
    // Format ngày
    const reviewDate = new Date(rv.created_at).toLocaleString('vi-VN');
    
    // Chỉ admin mới thấy reply box
    const replyBox = (userRole === 'admin') ? `
      <div class="reply-box">
        <input type="text" id="reply-${rv.product_id}-${rv.id}" placeholder="Phản hồi bình luận..." />
        <button onclick="sendReply(${rv.id}, ${rv.product_id})">Gửi</button>
      </div>
    ` : '';
    
    div.innerHTML = `
      <p><b>Người dùng #${rv.user_id}</b> (${new Date(rv.created_at).toLocaleString()}):</p>
      <p>${rv.comment ?? ""}</p>
      ${replyBox}
      ${(rv.comment_children || []).map(child => `
          <div class="reply">↳ ${child.comment}</div>

      `).join("")}
    `;
    container.appendChild(div);
  });
}

// Khởi tạo reviews
document.addEventListener('DOMContentLoaded', async function() {
  // Lấy role của user nếu có token
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
        userRole = (user.role || '').toString().toLowerCase();
        console.log("User role:", userRole);
      }
    } catch (error) {
      console.error("Lỗi lấy thông tin user:", error);
    }
  }

  const sendCommentBtn = document.getElementById("sendCommentBtn");
  if (sendCommentBtn) {
    if (token) {
      sendCommentBtn.addEventListener("click", sendComment);
    } else {
      sendCommentBtn.addEventListener("click", function () {
        alert("Vui lòng đăng nhập để bình luận!");
      });
    }
  }
  loadReviews();
});
// ================== CẤU HÌNH ==================
let selectedRating = 0;
let PRODUCT_ID = localStorage.getItem("productId");
// ================== LẤY DỮ LIỆU RATING ==================
async function loadRating() {
  const res = await fetch(`${API_URL}/reviews/rating?product_id=${PRODUCT_ID}`);
  const data = await res.json();

  // Cập nhật điểm trung bình
  document.getElementById("average-rating").textContent = data.average_rating;
  document.getElementById("rating-count").textContent = data.rating_count;

  // Cập nhật biểu đồ
  for (let i = 1; i <= 5; i++) {
    const cnt = data[`${i}_star_count`];
    document.getElementById(`count-${i}`).textContent = cnt;

    // phần trăm
    const percent = data.rating_count > 0 ? (cnt / data.rating_count) * 100 : 0;
    document.getElementById(`bar-${i}`).value = percent;
  }
}

// ================== GỬI / CẬP NHẬT RATING ==================
async function postRating() {
  if (selectedRating === 0) {
    alert("Vui lòng chọn số sao trước khi gửi!");
    return;
  }

  const token = localStorage.getItem("access_token"); // ⚠️ cần có JWT token từ login

  const res = await fetch(`${API_URL}/reviews/rating?product_id=${PRODUCT_ID}&rating=${selectedRating}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  alert(data.message);
  loadRating();
}


async function loadRecommendations() {
  try {
    const res = await fetch(`${API_URL}/api/recommend/${productId}?top_n=10`);
    if (!res.ok) throw new Error("Không thể lấy gợi ý");
    
    const data = await res.json();
    console.log("Gợi ý sản phẩm:", data);
    renderRecommendations(data.data);
  } catch (err) {
    console.error("Lỗi lấy gợi ý:", err);
  }
}

function renderRecommendations(recommendations) {
  const container = document.getElementById("recommendationsContainer_product");
  if (!container) {
    console.warn("recommendationsContainer not found in HTML");
    return;
  }
  
  if (!recommendations || recommendations.length === 0) {
    container.innerHTML = "<p style='text-align: center; padding: 20px;'>Không có sản phẩm gợi ý</p>";
    return;
  }
  
  // Tạo HTML cho slider
  const htmlList = recommendations.map(function (product) {
            var price = Number(product.price) || 0;
            var percent = Number(product.percent_abs) || 0;
            var discountedPrice = price - (percent / 100) * price;
            
            var priceSale = new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
            }).format(discountedPrice);
            
            var originalPrice = new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
            }).format(price);
            
 if (product.percent_abs > 0) {
                return `
                    <div class="col-product-5">
                        <div class="product__item" data-id="${product.id}">
                            <div class="product__media">
                                <img src="${product.thumb}" alt="${product.name}" class="product__media-img" />
                                <span class="product__media-note">
                                    <p>BẢO HÀNH 12 THÁNG</p>
                                </span>
                                <div class="product__media-promotion">-${product.percent_abs}%</div>
                            </div>
                            <div class="product__info">
                                <h3>${product.name}</h3>
                                <div class="product__price">
                                    <span>${priceSale}</span>
                                    <span class="line-through">${new Intl.NumberFormat("de-DE", {
                                        style: "currency",
                                        currency: "VND",
                                    }).format(product.price)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            else {
                return `
                    <div class="col-product-5">
                        <div class="product__item" data-id="${product.id}">
                            <div class="product__media">
                                <img src="${product.thumb}" alt="${product.name}" class="product__media-img" />
                                <span class="product__media-note">
                                    <p>BẢO HÀNH 12 THÁNG</p>
                                </span>
                            </div>
                            <div class="product__info">
                                <h3>${product.name}</h3>
                                <div class="product__price">
                                    <span>${priceSale}</span>
                                    <span class="line-through">${new Intl.NumberFormat("de-DE", {
                                        style: "currency",
                                        currency: "VND",
                                    }).format(product.price)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
        })
        .join("");
  
  // Set HTML với row
  container.innerHTML = `<div class="row product__list recommendation-list">${htmlList}</div>`;
  // Thêm event listener cho các product items
  var productItems = document.querySelectorAll(".product__item");
  productItems.forEach(function (item) {
      item.addEventListener("click", function () {
          var productId = item.getAttribute("data-id")
          var productName = item.querySelector(".product__info h3").innerText;
          var productImage = item.querySelector(".product__media-img").src;
          var productPrice = item.querySelector(".product__price span:first-child").innerText;
          var productPrice2 = productPrice.replace(/[^0-9]/g, "");
          // Loại bỏ ký tự không phải số
          localStorage.setItem("productId", productId);
          localStorage.setItem("productName", productName);
          localStorage.setItem("productImage", productImage);
          localStorage.setItem("productPrice", productPrice2);
          window.location.href = "info.html";
      });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadRating();
  loadRecommendations(); // Load gợi ý sản phẩm

  // chọn sao
  const stars = document.querySelectorAll("#user-stars i");
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      selectedRating = parseInt(star.dataset.value);

      stars.forEach((s, i) => {
        s.classList.toggle("fa-solid", i < selectedRating);
        s.classList.toggle("fa-regular", i >= selectedRating);
        s.style.color = i < selectedRating ? "#f39c12" : "#ccc";
      });
    });
  });

  document.getElementById("submit-rating").addEventListener("click", postRating);
});
