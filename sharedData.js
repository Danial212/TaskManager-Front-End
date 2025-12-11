import { getUser } from "./user.js";
import { getTasks, createTask, updateTask, deleteTask, getCategories, createCategories, updateCategories } from "./utills.js";
export {
    DomainURL, REFRESH_TOKEN, ACCESS_TOKEN, PRIORITY_BADGE, STATUS_LABEL, STATUS_LABEL_Array, PRIORITY_LABEL,
    GetStatusLabel, $, $$, fmtDate, sameDay, todayISO, getTextColor, getLuminance, taskDone, hexToRgb,
    fetchState, getCachdData, saveStateIntoCache, fetchNewData, state, setCookies, getCookies, removeCookies
}


const DomainURL = 'http://127.0.0.1:8000/'
const REFRESH_TOKEN = 'refresh_token'
const ACCESS_TOKEN = 'access_token'
const IGNORE_REFRESH_FETCH = true


const PRIORITY_BADGE = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
};

const STATUS_LABEL = { W: 'toDo', P: 'inProgress', C: 'Done' };
const STATUS_LABEL_Array = ['W', 'P', 'C'];
const PRIORITY_LABEL = { H: 'High', M: 'Medium', L: 'Low' };

function GetStatusLabel(status) {
    for (const label in STATUS_LABEL)
        if (STATUS_LABEL[label] == status)
            return label;
}

/********************
 * Data Layer
 ********************/
const STORAGE_KEY = 'taskflow:v1';
const STORAGE_DURATION = 5 * 60 * 1000;

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


/********************
 * Helpers
********************/
function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12, 0, 0, 0); return d.toISOString(); }
//  Selects only one object with the given detail
const $ = sel => document.querySelector(sel);
//  Selects an array of objects with the given detail
const $$ = sel => Array.from(document.querySelectorAll(sel));
const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const todayISO = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.toISOString(); };
function sameDay(a, b) { return a.getFullYear() == b.getFullYear() && a.getMonth() == b.getMonth() && a.getDate() == b.getDate(); }

async function state() {
    let data = getCachdData()
    if (data != null)
        return data;

    data = await fetchState();
    saveStateIntoCache(data, Date.now())
    return data;
}

async function fetchNewData() {
    if (IGNORE_REFRESH_FETCH)
        return getCachdData()
    const data = await fetchState();
    saveStateIntoCache(data, Date.now())
    return data;
}

function saveStateIntoCache(data, time) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data, time
    }));
}

function getCachdData() {
    let cached = (localStorage.getItem(STORAGE_KEY));

    if (cached) {
        const { data, time } = JSON.parse(cached);
        const isValid = (Date.now() - time) < STORAGE_DURATION;

        if (isValid || IGNORE_REFRESH_FETCH)
            return data;
    }
    return null;
}

async function fetchState() {
    let currentUser = await getUser();
    let categories = await getCategories();
    let tasks = await getTasks();

    let user = { name: currentUser.username, email: currentUser.email };

    let data =
    {
        user,
        categories,
        tasks
    };
    return data;
}





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
