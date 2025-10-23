var searchInput = document.querySelectorAll(".search-product");
searchInput.forEach((input) => {
    input.addEventListener("keyup", (e) => {
        if (e.key == "Enter") {
            const query = input.value.trim();
            if (query.length > 0) {
                // Redirect với query parameter
                window.location.href = `search-results.html?q=${encodeURIComponent(query)}`;
            } else {
                alert("Vui lòng nhập từ khóa tìm kiếm!");
            }
        }
    });
});
