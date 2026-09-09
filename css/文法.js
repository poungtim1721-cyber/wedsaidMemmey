document.addEventListener('DOMContentLoaded', () => {
    
    // ระบบเปลี่ยนสถานะ active (สีเขียว) เมื่อคลิกเลือกเมนู N5, N4, N3...
    const navItems = document.querySelectorAll('.nav-links .nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // ลบสถานะ active จากทุกปุ่ม
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // เพิ่มสถานะ active ให้ปุ่มที่ถูกคลิก
            this.classList.add('active');
        });
    });

    // ระบบค้นหาเมื่อกดปุ่ม Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    alert('กำลังค้นหา: ' + query);
                    // สามารถเปลี่ยนหน้าไปยังการค้นหาจริงได้ เช่น:
                    // window.location.href = `/search?q=${encodeURIComponent(query)}`;
                }
            }
        });
    }

});