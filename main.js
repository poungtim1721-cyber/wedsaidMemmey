// =================================================================
//  ฟังก์ชันสลับหน้าจอ (getElementById ใหม่ทุกครั้ง ป้องกัน error หน้าไม่มี element)
// =================================================================
function showRegister() {
    const loginSection = document.getElementById("loginSection");
    const registerSection = document.getElementById("registerSection");
    const msgBubble = document.getElementById("msgBubble");
    if (loginSection) loginSection.style.display = "none";
    if (registerSection) registerSection.style.display = "block";
    if (msgBubble) msgBubble.innerText = "Let's join us!";
}

function showLogin() {
    const loginSection = document.getElementById("loginSection");
    const registerSection = document.getElementById("registerSection");
    const msgBubble = document.getElementById("msgBubble");
    if (loginSection) loginSection.style.display = "block";
    if (registerSection) registerSection.style.display = "none";
    if (msgBubble) msgBubble.innerText = "Welcome Back!";
}

function continueAsGuest() {
    localStorage.removeItem("registeredName");
    localStorage.removeItem("registeredEmail");
    sessionStorage.setItem("guestMode", "true");
    window.location.href = "home.html";
}

// =================================================================
//  เริ่มทำงานเมื่อ HTML โหลดเสร็จ
// =================================================================
document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");
    const regPass = document.getElementById("RegPass");
    const confirmPass = document.getElementById("ConfirmPass");
    const regBtn = document.getElementById("RegBtn");
    const regForm = document.getElementById("regForm");

    if (new URLSearchParams(window.location.search).get("register") === "1") {
        showRegister();
    }

    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();
            handleSignIn();
        });
    }

    function validateForm() {
        if (!regBtn || !regPass || !confirmPass) return;
        const isMatch = (regPass.value === confirmPass.value && regPass.value !== "");
        const isLongEnough = regPass.value.length >= 6;

        regBtn.disabled = !(isMatch && isLongEnough);
        regBtn.style.opacity = (isMatch && isLongEnough) ? "1" : "0.5";
        confirmPass.style.borderColor = isMatch ? "#26de81" : "#ff4d4d";
    }

    if (regPass && confirmPass) {
        regPass.addEventListener("input", validateForm);
        confirmPass.addEventListener("input", validateForm);
    }

    // --- ฟอร์มสมัครสมาชิก ---
    if (regForm) {
        regForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const user = document.getElementById("RegUser").value.trim();
            const email = document.getElementById("RegEmail").value.trim();
            const pass = regPass ? regPass.value : "";

            if (!user) { alert("กรุณากรอกชื่อผู้ใช้"); return; }
            if (!email || !email.includes("@")) { alert("กรุณากรอก Email ให้ถูกต้อง"); return; }

            let users = JSON.parse(localStorage.getItem("users")) || [];

            if (users.find(u => u.username === user || u.email === email)) {
                alert("ชื่อผู้ใช้หรือ Email นี้ถูกใช้ไปแล้ว");
                return;
            }

            users.push({ username: user, email: email, password: pass });
            localStorage.setItem("users", JSON.stringify(users));

            //  บันทึกชื่อทันที หน้าแรกจะได้โชว์ทันที (แม้ยังไม่ Sign in)
            localStorage.setItem("registeredName", user);
            localStorage.setItem("registeredEmail", email);
            sessionStorage.removeItem("guestMode");

            alert("ลงทะเบียนสำเร็จ! ยินดีต้อนรับ " + user);
            window.location.href = "home.html";
        });
    }
});

// =================================================================
//  ฟังก์ชันล็อกอิน (global ใช้กับ onclick ของปุ่มได้)
// =================================================================
function handleSignIn() {
    const userInp = document.getElementById("LoginUser").value.trim();
    const passInp = document.getElementById("LoginPass").value;

    let users = JSON.parse(localStorage.getItem("users")) || [];
    const userMatch = users.find(u =>
        (u.username === userInp || u.email === userInp) && u.password === passInp
    );

    if (userMatch) {
        sessionStorage.removeItem("guestMode");
        localStorage.setItem("registeredName", userMatch.username);
        alert("ยินดีต้อนรับเข้าสู่ระบบ!");
        window.location.href = "home.html";
    } else {
        alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        const card = document.querySelector(".login-card");
        if (card) {
            card.classList.add("shake");
            setTimeout(() => card.classList.remove("shake"), 500);
        }
    }
}

function loadUsername() {
    const savedName = localStorage.getItem("registeredName");
    const profileNameElement = document.getElementById("profileName");
    if (!profileNameElement) return;

    const displayName = savedName || "日本語";
    profileNameElement.innerText = displayName;

    // อัปเดตตัวอักษรในวงกลม avatar ให้เป็นตัวแรกของชื่อ
    const userAvatar = document.getElementById("userAvatar");
    if (userAvatar) {
        userAvatar.innerText = displayName.charAt(0).toUpperCase();
    }
}

document.addEventListener("DOMContentLoaded", loadUsername);
// =================================================================
//  main.js — สำหรับหน้าแรก (home) เท่านั้น
// =================================================================

function loadUsername() {
    var savedName = localStorage.getItem("registeredName");
    var profileNameElement = document.getElementById("profileName");
    if (!profileNameElement) return;
    profileNameElement.innerText = savedName || "日本語";
}

document.addEventListener("DOMContentLoaded", function () {
    loadUsername();

    // ... ใส่โค้ด Slider / Swiper / Sidebar ของหน้าแรกได้เลยตรงนี้ ...
});