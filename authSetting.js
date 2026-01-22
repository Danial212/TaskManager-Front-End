import { getAuthTokens, signup } from "./auth.js";

// Page wide varible
const loginForm = document.getElementById('loginForm');
const signUpForm = document.getElementById('signUpForm')

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;


// Check for saved theme preference or default to light mode
const currentTheme = 'dark'; //localStorage.getItem('theme') || 'dark';
if (currentTheme === 'dark') {
    html.classList.add('dark');
}

themeToggle.addEventListener('click', () => {
    html.classList.toggle('dark');
    const theme = html.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
});


//  password toogle event handler
function PT_EventHandler(passwordInput, eyeOpen, eyeClosed) {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    eyeOpen.classList.toggle('hidden');
    eyeClosed.classList.toggle('hidden');
}

//  Manages display options for login form
function loginCardManager() {
    // Password Toggle
    const togglePassword = loginForm.querySelector('#togglePassword-login');
    const passwordInput = loginForm.querySelector('#password-login');
    const eyeOpen = loginForm.querySelector('#eyeOpen-login');
    const eyeClosed = loginForm.querySelector('#eyeClosed-login');

    togglePassword.addEventListener('click', () => PT_EventHandler(passwordInput, eyeOpen, eyeClosed));
}

//  Manages display options for signup form
function signUpCardManager() {
    // Password Toggle
    const togglePassword = signUpForm.querySelector('#togglePassword-signup');
    const passwordInput = signUpForm.querySelector('#password-signup');
    const eyeOpen = signUpForm.querySelector('#eyeOpen-signup');
    const eyeClosed = signUpForm.querySelector('#eyeClosed-signup');

    togglePassword.addEventListener('click', () => PT_EventHandler(passwordInput, eyeOpen, eyeClosed));


    // Password Confirm Toggle
    const togglePasswordConfirm = signUpForm.querySelector('#togglePassword-signup-confirm');
    const passwordInputConfirm = signUpForm.querySelector('#password-signup-confirm');
    const eyeOpenConfirm = signUpForm.querySelector('#eyeOpen-signup-confirm');
    const eyeClosedConfirm = signUpForm.querySelector('#eyeClosed-signup-confirm');

    togglePasswordConfirm.addEventListener('click', () => PT_EventHandler(passwordInputConfirm, eyeOpenConfirm, eyeClosedConfirm));
}

// Toast Notification Function
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `px-5 py-3 rounded-xl shadow-xl border flex items-center gap-3 transform transition-all duration-300 ${type === 'error'
        ? 'border-red-300 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800'
        : type === 'success'
            ? 'border-green-300 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800'
            : 'border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800'
        }`;

    const icon = type === 'error'
        ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        : type === 'success'
            ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
            : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

    toast.innerHTML = icon + `<span class="font-medium">${message}</span>`;

    const container = document.getElementById('toastContainer');
    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userName = loginForm.querySelector('#userName-login').value;
    const password = loginForm.querySelector('#password-login').value;
    // const remember = loginForm.querySelector('#remember-login').checked;

    // Basic validation
    if (!userName || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    // userName validation (Must be changed from email to user name)
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (!emailRegex.test(email)) {
    //     showToast('Please enter a valid email address', 'error');
    //     return;
    // }

    // Show loading state
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
                <svg class="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            `;

    try {
        await getAuthTokens(userName, password);

        console.log('Login attempt:', { userName, password, remember });

        showToast('Login successful! Redirecting...', 'success');

        // Redirect after success
        setTimeout(() => {
            window.location.href = '/index.html';
            console.log('Redirecting to dashboard...');
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed. Please try again.', 'error');
    } finally {
        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// Input focus animations
const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
inputs.forEach(input => {
    input.addEventListener('focus', () => {

    });
    input.addEventListener('blur', () => {

    });
});

// Social login buttons (placeholder functions)
// const socialButtons = document.getElementsByClassName('e-auth-button');


const login_form = document.getElementById('login-form')
const signup_form = document.getElementById('signup-form')

const sign_up_switch = document.getElementById('sign-up-switch');
const sign_in_switch = document.getElementById('sign-in-switch');

sign_up_switch.addEventListener('click', () => {
    login_form.classList.add('hidden');
    signup_form.classList.remove('hidden');
})

sign_in_switch.addEventListener('click', () => {
    login_form.classList.remove('hidden');
    signup_form.classList.add('hidden');
})

const submitBtn = signUpForm.querySelector('button[type="submit"]');


// Signup event (saving user info into database + save locally into cookie)
signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userName = signUpForm.querySelector('#userName-signup').value;
    const email = signUpForm.querySelector('#email').value;
    const password = signUpForm.querySelector('#password-signup').value;
    const password_confirm = signUpForm.querySelector('#password-signup-confirm').value;


    if (password !== password_confirm) {
        showToast("Paswords must match", 'error')
        return;
    }


    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
                <svg class="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            `;


        await signup(userName, password, email);
        // await getAuthTokens(userName, password);

        showToast('Login successful! Redirecting...');

        window.location.href = '/index.html';

    } catch (err) {
        if (err.message == '500' || err.message == '400')
            showToast("A user with same info already exists.", 'error')
        else
            console.error(err);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Sign Up`;
    }
})

loginCardManager();
signUpCardManager();