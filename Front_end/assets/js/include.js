// Include Components - Header & Footer
document.addEventListener('DOMContentLoaded', function() {
    
    // Load Header
    fetch('./components/header.html')
        .then(response => response.text())
        .then(data => {
            const headerContainer = document.getElementById('header-placeholder');
            if (headerContainer) {
                headerContainer.innerHTML = data;
            }
            
            // Sau khi load header, khởi tạo lại các script cần thiết
            initializeHeaderScripts();

            // Load search.js AFTER header is loaded
            loadSearchScript();

            // Khởi tạo hiển thị người dùng: render từ cache trước, rồi refresh API
            if (typeof initUserHeader === 'function') {
                initUserHeader();
            } else if (typeof checkUserLogin === 'function') {
                // fallback nếu code cũ
                checkUserLogin();
            }
        })
        .catch(error => {
            console.error('Error loading header:', error);
        });
    
    // Load Footer
    fetch('./components/footer.html')
        .then(response => response.text())
        .then(data => {
            const footerContainer = document.getElementById('footer-placeholder');
            if (footerContainer) {
                footerContainer.innerHTML = data;
            }
        })
        .catch(error => {
            console.error('Error loading footer:', error);
        });
});

function initializeHeaderScripts() {
    // Highlight active menu item dựa trên current page
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
}

// Load search.js dynamically
function loadSearchScript() {
    const script = document.createElement('script');
    script.src = './assets/js/search.js';
    script.onload = function() {
        console.log('search.js loaded successfully');
    };
    script.onerror = function() {
        console.error('Error loading search.js');
    };
    document.body.appendChild(script);
}
function loadSearchInfo() {
    const script = document.createElement('script');
    script.src = './assets/js/search-results.js';
    script.onload = function() {
        console.log('search-results.js loaded successfully');
    };
    script.onerror = function() {
        console.error('Error loading search-results.js');
    };
    document.body.appendChild(script);
}