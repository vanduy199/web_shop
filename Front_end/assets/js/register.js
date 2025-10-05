document.getElementById("form-register").addEventListener("submit", async (e) => {
  e.preventDefault();

  const API_URL = "http://localhost:8000"; // Define your API URL
  
  // Get form data
  const username = document.getElementById("username").value.trim();
  const full_name = document.getElementById("fullname").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const payload = {
    username,
    full_name,
    phone,
    email,
    password,
  };

  try {
    const response = await fetch(`${API_URL}/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("Response:", {
      status: response.status,
      data: data
    });

    if (response.ok) {
      alert("Đăng ký thành công!");
      window.location.href = "login.html";
    } else {
      alert(`Lỗi: ${data.detail || "Đăng ký thất bại"}`);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("⚠️ Không thể kết nối đến server!");
  }
});
