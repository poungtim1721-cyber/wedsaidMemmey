const loginBtn = document.querySelector('#loginSection .action-btn');
const regBtn = document.querySelector('#registerSection .action-btn');
const msgBubble = document.getElementById('msgBubble');


function showForgot() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('forgotSection').style.display = 'block';
    
    if(msgBubble) {
        msgBubble.innerText = "ให้ช่วยกู้รหัสไหมครับ? ";
    }
}

function showLogin() {
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('forgotSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    
    if(msgBubble) {
        msgBubble.innerText = "Welcome Back!";
    }
}

function showRegister() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('forgotSection').style.display = 'none';
    document.getElementById('registerSection').style.display = 'block';
}

regBtn.addEventListener('click', () => {
    const user = document.getElementById('RegUser').value;
    const pass = document.getElementById('RegPass').value;
    const confirm = document.getElementById('ConfirmPass').value;

    if (!user || !pass) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    if (pass !== confirm) {
        alert("รหัสผ่านไม่ตรงกัน!");
        if(msgBubble) msgBubble.innerText = "Passwords don't match! ❌";
        return;
    }
    
    localStorage.setItem('db_username', user);
    localStorage.setItem('db_password', pass);

    alert("ลงทะเบียนสำเร็จ! ยินดีต้อนรับคุณ " + user);
    if(msgBubble) msgBubble.innerText = "Success! Now Login ✨";
    showLogin();
    document.getElementById('LoginUser').value = user;
});

loginBtn.addEventListener('click', () => {
    const userIn = document.getElementById('LoginUser').value;
    const passIn = document.getElementById('LoginPass').value;
    const savedUser = localStorage.getItem('db_username');
    const savedPass = localStorage.getItem('db_password');

    if (userIn === savedUser && passIn === savedPass && userIn !== null) {
        if(msgBubble) msgBubble.innerText = "Access Granted! ";
        alert("ยินดีต้อนรับเข้าสู่ระบบ");
    } else {
        if(msgBubble) msgBubble.innerText = "Wrong Info! Try again ";
        alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        const card = document.querySelector('.login-card');
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 500);
    }
});

function handleNextStep() {
    const user = document.getElementById('ForgotUser').value;
    const contact = document.getElementById('ForgotContact').value;

    if (user && contact) {
        alert("ระบบตรวจสอบข้อมูลเรียบร้อย! กำลังส่งรหัส OTP ไปที่ " + contact);
        showLogin();
    } else {
        alert("กรุณากรอกข้อมูลให้ครบถ้วนก่อนไปต่อครับ");
    }
}

function socialLogin(platform) {
    alert("ระบบกำลังเชื่อมต่อกับ " + platform + "... (นี่คือระบบจำลอง)");
}

document.querySelector('.social-btn-google').onclick = () => socialLogin('Google');
document.querySelector('.social-btn-facebook').onclick = () => socialLogin('Facebook');