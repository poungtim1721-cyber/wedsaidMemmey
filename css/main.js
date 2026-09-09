// ดึง Element สำคัญ
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const msgBubble = document.getElementById('msgBubble');
const regPass = document.getElementById('RegPass');
const confirmPass = document.getElementById('ConfirmPass');
const bars = document.querySelector('#bars div');
const regBtn = document.getElementById('RegBtn');

// --- ฟังก์ชันสลับหน้าจอ ---
function showRegister() {
    loginSection.style.display = "none";
    registerSection.style.display = "block";
    if(msgBubble) msgBubble.innerText = "Let's join us! ";
}

function showLogin() {
    registerSection.style.display = "none";
    loginSection.style.display = "block";
    if(msgBubble) msgBubble.innerText = "Welcome Back! ";
}

// --- ระบบเช็คความแรงรหัสผ่าน ---
regPass.addEventListener('input', () => {
    let strength = 0;
    const val = regPass.value;

    if (val.length >= 6) strength++;
    if (val.match(/[A-Z]/)) strength++;
    if (val.match(/[0-9]/)) strength++;
    if (val.match(/[^A-Za-z0-9]/)) strength++;
    if(bars) {
        bars.style.width = (strength * 25) + "%";
        bars.style.backgroundColor = colors[strength];
    }
    if(msgBubble) msgBubble.innerText = status[strength];
    validateForm(); // เช็คปุ่มสมัคร
});

confirmPass.addEventListener('input', validateForm);

// ฟังก์ชันเปิด/ปิดปุ่มสมัคร
function validateForm() {
    const isMatch = (regPass.value === confirmPass.value && regPass.value !== "");
    const isLongEnough = regPass.value.length >= 6;

    if (isMatch && isLongEnough) {
        regBtn.disabled = false;
        regBtn.style.opacity = "1";
        confirmPass.style.borderColor = "#26de81";
    } else {
        regBtn.disabled = true;
        regBtn.style.opacity = "0.5";
        confirmPass.style.borderColor = "#ff4d4d";
    }
}

// --- ส่วนการสมัครสมาชิก (Register) ---
const regForm = document.getElementById('regForm');
if(regForm) {
    regForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const user = document.getElementById('RegUser').value;
        const pass = regPass.value;

        let users = JSON.parse(localStorage.getItem('users')) || [];

        if (users.find(u => u.username === user)) {
            alert("ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว");
            return;
        }

        users.push({ username: user, password: pass });
        localStorage.setItem('users', JSON.stringify(users));

        alert("ลงทะเบียนสำเร็จ!");
        showLogin();
        document.getElementById('LoginUser').value = user;
    });
}

// --- ส่วนการเข้าสู่ระบบ (Sign In) ---
function handleSignIn() {
    const userInp = document.getElementById('LoginUser').value;
    const passInp = document.getElementById('LoginPass').value;

    let users = JSON.parse(localStorage.getItem('users')) || [];
    const userMatch = users.find(u => u.username === userInp && u.password === passInp);

    if (userMatch) {
        alert("ยินดีต้อนรับเข้าสู่ระบบ!");
        
        // 💾 🌟 จุดที่เพิ่มเข้ามา: เก็บชื่อผู้ใช้ที่ล็อกอินสำเร็จไว้ในบราวเซอร์ 
        // โดยใช้คีย์ว่า "registeredName" เพื่อให้ตรงกับหน้าแรก (home.html) ที่จะดึงไปใช้
        localStorage.setItem("registeredName", userMatch.username);
        
        window.location.href = "home.html";
    } else {
        alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        const card = document.querySelector('.login-card');
        if (card) {
            card.classList.add('shake');
            setTimeout(() => card.classList.remove('shake'), 500);
        }
    }
}

// Social Login จำลอง
function socialAuth(platform) {
    alert("ระบบกำลังเชื่อมต่อกับ " + platform + "... (นี่คือระบบจำลอง)");
}