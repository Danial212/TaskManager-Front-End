import { getUser } from "./user.js";
import { getTasks, createTask, updateTask, deleteTask, getCategories, createCategories, updateCategories } from "./utills.js";
export {
    NULL_CATEGORY_TITLE, DomainURL, REFRESH_TOKEN, ACCESS_TOKEN, PRIORITY_BADGE, STATUS_LABEL, STATUS_LABEL_Array, PRIORITY_LABEL,
    GetStatusLabel, $, $$, fmtDate, sameDay, todayISO, getTextColor, getLuminance, taskDone, hexToRgb,
    fetchState, saveStateIntoCache, fetchNewData, state, setCookies, getCookies, removeCookies,
    getDayName, getMonthYear, getDaysInMonth, getFirstDayOfMonth,
    toast, loadSettings, value_label_pair
}



const DomainURL = 'http://127.0.0.1:8000/'
const REFRESH_TOKEN = 'refresh_token'
const ACCESS_TOKEN = 'access_token'
const IGNORE_REFRESH_FETCH = false
const NULL_CATEGORY_TITLE = "null-category"


const PRIORITY_BADGE = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
};

const STATUS_LABEL = { W: 'toDo', P: 'inProgress', C: 'Done' };
const STATUS_LABEL_Array = ['W', 'P', 'C'];
const PRIORITY_LABEL = { H: 'High', M: 'Medium', L: 'Low' };

function value_label_pair(dict) {
    let dictionary = []
    let index = 0
    for (const value in dict) {
        dictionary[index++] = { value: value, label: dict[value] }
    };

    console.log(dictionary);
    return dictionary
}

function GetStatusLabel(status) {
    for (const label in STATUS_LABEL)
        if (STATUS_LABEL[label] == status)
            return label;
}

/********************
 * Data Layer
 ********************/
const STORAGE_KEY = 'taskflow:v1';
const STORAGE_DURATION = 5 * 60; //  Cached expiration time in secound

// Complete cookie functions
function setCookies(name, value, days = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/`;
}

function getCookies(name) {  // Remove the 'value' parameter
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === name) {
            return cookieValue;
        }
    }
    return null;
}

function removeCookies() {
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
        let [name, value] = cookie.split('=');
        document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    });
}


// #region Local Storage Management

function saveStateIntoCache(data, time) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data, time
    }));
}

function getCache() {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : null;
}

//#endregion

// #region Fetch & API Interfaces
/**
 * The "Smart Gateway": Returns cache if valid, otherwise fetches.
 */
async function state() {
    const cached = getCache();

    if (cached) {
        const { data, time } = cached;
        const ageInSec = (Date.now() - time) / 1000;
        const isValid = ageInSec < (STORAGE_DURATION);
        
        console.log(`Last update: ${ageInSec.toFixed(1)} seconds ago`);

        if (isValid || IGNORE_REFRESH_FETCH) {
            return data;
        }
    }
    
    return await fetchNewData();
}

/**
 * The "Hammer": Ignores cache and hits the server.
 */
async function fetchNewData() {
    // If IGNORE_REFRESH_FETCH is true, we still respect the cache if it exists
    if (IGNORE_REFRESH_FETCH) {
        const cached = getCache();
        if (cached) return cached.data;
    }

    const data = await fetchState();
    saveStateIntoCache(data, Date.now());
    return data;
}

async function fetchState() {
    // Parallel fetching is much faster than awaiting one by one
    const [currentUser, categories, tasks] = await Promise.all([
        getUser(),
        getCategories(),
        getTasks()
    ]);

    return {
        user: { name: currentUser.username, email: currentUser.email },
        categories,
        tasks
    };
}

//#endregion


// #region  Helpers

function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12, 0, 0, 0); return d.toISOString(); }
//  Selects only one object with the given detail
const $ = sel => document.querySelector(sel);
//  Selects an array of objects with the given detail
const $$ = sel => Array.from(document.querySelectorAll(sel));
const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const todayISO = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.toISOString(); };
function sameDay(a, b) { return a.getFullYear() == b.getFullYear() && a.getMonth() == b.getMonth() && a.getDate() == b.getDate(); }

function getTextColor(bgColor) {
    const rgb = hexToRgb(bgColor);
    if (!rgb)
        return '#FFFFFF';

    const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
    return luminance > 0.5 ? '#1F2937' : '#FFFFFF';
}


function taskDone(t) {
    return t.status === GetStatusLabel("Done");
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

//#endregion


// #region Date and Timing

// Get day name (Monday, Tuesday, etc.)
function getDayName(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

// Get month and year string
function getMonthYear(date) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}


// Get number of days in month
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// Get first day of month (0 = Sunday)
function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

//#endregion


/********************
 * Toasts
 ********************/
function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `px-5 py-3 rounded-xl shadow-xl border flex items-center gap-3 ${type === 'error' ? 'border-red-300 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800' : 'border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800'}`;

    const icon = type === 'error'
        ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        : '<svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

    el.innerHTML = icon + `<span class="font-medium">${msg}</span>`;
    $('#toastStack').appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(100%)';
        el.style.transition = 'all .3s';
        setTimeout(() => el.remove(), 300);
    }, 2500);
}

/********************
 * Settings Management
 ********************/
const SETTINGS_KEY = 'taskflow:settings:v1';
const DEFAULT_SETTINGS = {
    // Appearance
    theme: 'dark',
    defaultView: 'dashboard',
    dateFormat: 'short',

    // Task Defaults
    defaultTaskPriority: 'M',
    defaultTaskStatus: 'W',
    defaultReminderTime: '09:00',

    // Notifications
    enableNotifications: true,
    notifyBeforeDue: 24,

    // Behavior
    autoSaveNotes: true,
    showCompletedTasks: true,
    enableKeyboardShortcuts: true,
    enableDragDrop: true,

    // Future extensibility
    experimental: {}
};

function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    toast('Settings saved successfully');
}