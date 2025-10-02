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
            
            // Trigger user login check sau khi header đã load
            if (typeof checkUserLogin === 'function') {
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
    
    // Search functionality (nếu cần)
    const searchInput = document.getElementById('search-product');
    if (searchInput) {
        // Thêm logic search ở đây nếu cần
    }
}