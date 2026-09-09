
// ฟังก์ชันสำหรับเช็คและแสดงชื่อที่ลงทะเบียน
function loadUsername() {
    // ไปดึงข้อมูลที่ชื่อว่า "registeredName" ออกมาจากความจำบราวเซอร์
    const savedName = localStorage.getItem("registeredName");
    const profileNameElement = document.getElementById("profileName");

    // ถ้าเจอชื่อที่บันทึกไว้ ให้เปลี่ยนข้อความใน <h3> เป็นชื่อนั้น
    if (savedName) {
        profileNameElement.innerText = savedName;
    } else {
        // ถ้าไม่เจอชื่อ (เช่น ยังไม่ได้ลงทะเบียน) ให้ใช้ชื่อเริ่มต้น
        profileNameElement.innerText = "塩キツさん";
    }
}
// สั่งให้ฟังก์ชันทำงานทันทีที่เปิดหน้าเว็บนี้ขึ้นมา
window.onload = loadUsername;
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        // ลบคลาส active จากตัวอื่น
        document.querySelectorAll('.nav-item').forEach(i => i.style.color = '');
        // เพิ่มสีให้ตัวที่คลิก
        this.style.color = 'white';
    });
});

// ฟังก์ชันเปิด/ปิด Sidebar (ถ้าต้องการ)
const toggleBtn = document.querySelector('.collapse-toggle');
const sidebar = document.querySelector('.double-sidebar');

toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    // คุณสามารถเพิ่ม CSS สำหรับ .collapsed { width: 70px; } ต่อได้
});
var swiper = new Swiper(".mySwiper", {
            slidesPerView: "auto",
            centeredSlides: true,
            spaceBetween: 50, // <-- เพิ่มตัวเลขตรงนี้ (เช่นจาก 30 เป็น 50 หรือ 60) ถ้ารูปเบียดกันเกินไป
            loop: true,
            // ... (โค้ดส่วนอื่นๆ คงเดิม)
            pagination: {
                el: ".swiper-pagination", // <-- ตรวจสอบว่ามี element ที่มี class นี้
                clickable: true,    // <-- ทำให้ pagination สามารถคลิกได้
            },
        });

window.addEventListener('load', function() {
    const container = document.getElementById('mangaSlider');
    const track = document.getElementById('mangaTrack');
    const slides = Array.from(track.children);
    const prevBtn = document.getElementById('mangaPrevBtn');
    const nextBtn = document.getElementById('mangaNextBtn');
    const dotsContainer = document.getElementById('mangaDots');

    if (!container || !track || slides.length === 0) return;

    let currentIndex = 0;
    let startX = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let isDragging = false;
    let autoPlayTimer = null;
    const autoPlayDelay = 3500; // ตั้งเวลาเลื่อนภาพอัตโนมัติ (3.5 วินาที)

    // สร้างจุดบอกตำแหน่งด้านล่าง
    slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = `manga-dot ${i === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    });
    const dots = Array.from(dotsContainer.children);

    function updateSlider() {
        const slideWidth = slides[0].offsetWidth;
        const containerWidth = container.offsetWidth;
        const margin = slideWidth * 0.04; 
        const totalSlideWidth = slideWidth + margin;

        const centerOffset = (containerWidth - slideWidth) / 2;
        currentTranslate = centerOffset - (currentIndex * totalSlideWidth);
        prevTranslate = currentTranslate;

        track.style.transition = isDragging ? 'none' : 'transform 0.4s ease-out';
        track.style.transform = `translateX(${currentTranslate}px)`;

        slides.forEach((slide, idx) => slide.classList.toggle('active', idx === currentIndex));
        dots.forEach((dot, idx) => dot.classList.toggle('active', idx === currentIndex));
    }

    function goToSlide(index) {
        currentIndex = index;
        updateSlider();
        startAutoPlay();
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % slides.length;
        updateSlider();
    }

    function prevSlide() {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        updateSlider();
    }

    function startAutoPlay() {
        stopAutoPlay();
        autoPlayTimer = setInterval(nextSlide, autoPlayDelay);
    }

    function stopAutoPlay() {
        if (autoPlayTimer) clearInterval(autoPlayTimer);
    }

    // คลิกปุ่มลูกศร
    nextBtn.addEventListener('click', () => { nextSlide(); startAutoPlay(); });
    prevBtn.addEventListener('click', () => { prevSlide(); startAutoPlay(); });

    // ระบบจับการปัดนิ้ว/ลากเมาส์
    function onStart(e) {
        isDragging = true;
        startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        stopAutoPlay();
    }

    function onMove(e) {
        if (!isDragging) return;
        const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const diff = currentX - startX;
        track.style.transition = 'none';
        track.style.transform = `translateX(${prevTranslate + diff}px)`;
    }

    function onEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        const endX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
        const diff = endX - startX;

        if (diff < -50) {
            nextSlide();
        } else if (diff > 50) {
            prevSlide();
        } else {
            updateSlider();
        }
        startAutoPlay();
    }

    track.addEventListener('mousedown', onStart);
    track.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    track.addEventListener('touchstart', onStart, { passive: true });
    track.addEventListener('touchmove', onMove, { passive: true });
    track.addEventListener('touchend', onEnd);

    window.addEventListener('resize', updateSlider);

    updateSlider();
    startAutoPlay();
});

// สร้างปุ่มกดตัวเลข 1, 2, 3, 4... ตามจำนวนรูป
    slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = `manga-dot ${i === 0 ? 'active' : ''}`;
        dot.textContent = i + 1; // แสดงตัวเลข 1, 2, 3...

        // เพิ่มการคลิกเปลี่ยนหน้า
        dot.addEventListener('click', (e) => {
            e.stopPropagation(); // ป้องกันไม่ให้ Event ไปกวนระบบลากนิ้ว
            goToSlide(i);
        });

        dotsContainer.appendChild(dot);
    });
    const dots = Array.from(dotsContainer.children);

    // ฟังก์ชันย้ายไปหน้าที่เลือก
    function goToSlide(index) {
        currentIndex = index;
        updateSlider();
        startAutoPlay(); // เริ่มนับเวลาใหม่เมื่อกดเลือกหน้า
    }

    window.addEventListener('load', function() {
    // ----------------------------------------------------
    // สคริปต์สำหรับ Slider เรียงหน้ากระดานด้านล่าง
    // ----------------------------------------------------
    const row = document.getElementById('mangaRow');
    const leftBtn = document.getElementById('rowLeftBtn');
    const rightBtn = document.getElementById('rowRightBtn');

    if (row && leftBtn && rightBtn) {
        // กดปุ่มขวา
        rightBtn.addEventListener('click', () => {
            // เลื่อนไปทางขวา = ครึ่งนึงของความกว้างหน้าจอ
            row.scrollBy({ left: row.offsetWidth / 2, behavior: 'smooth' });
        });

        // กดปุ่มซ้าย
        leftBtn.addEventListener('click', () => {
            // เลื่อนไปทางซ้าย = ครึ่งนึงของความกว้างหน้าจอ
            row.scrollBy({ left: -(row.offsetWidth / 2), behavior: 'smooth' });
        });

        // --- ระบบลากด้วยเมาส์ (Drag to Scroll) ---
        let isDown = false;
        let startX;
        let scrollLeft;

        row.addEventListener('mousedown', (e) => {
            isDown = true;
            row.style.scrollBehavior = 'auto'; // ปิด smooth ชั่วคราวตอนลากเพื่อให้ติดมือ
            row.style.cursor = 'grabbing';
            startX = e.pageX - row.offsetLeft;
            scrollLeft = row.scrollLeft;
        });

        row.addEventListener('mouseleave', () => {
            isDown = false;
            row.style.scrollBehavior = 'smooth';
            row.style.cursor = 'grab';
        });

        row.addEventListener('mouseup', () => {
            isDown = false;
            row.style.scrollBehavior = 'smooth';
            row.style.cursor = 'grab';
        });

        row.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - row.offsetLeft;
            const walk = (x - startX) * 1.5; // ตัวคูณความเร็วในการลาก
            row.scrollLeft = scrollLeft - walk;
        });
    }
});