import { getUser } from "./user.js";
import { getTasks, createTask, updateTask, getCategories, createCategories, updateCategories } from "./utills.js";

// Optional Tailwind config (extend colors, shadows)
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
                    500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81'
                }
            },
            boxShadow: {
                soft: '0 10px 25px -10px rgba(0,0,0,0.15)'
            },
            borderRadius: {
                '2xl': '1.25rem'
            }
        }
    }
}

/********************    Minimal Data Layer (localStorage)\n     
 Replace fetch/save with DRF endpoints later.\n     ********************/
const STORAGE_KEY = 'taskflow:v1';
//  the time duration for data catch (User, Category, Tasks)
const STORAGE_DURATION = 5 * 60 * 1000;

async function state() {
    //  Use calid cach data from local storage
    let data = getCachdData()
    if (data != null)
        return data;

    //  Fetch fresh data from server + save into cache
    data = await fetchState();
    saveStateIntoCache(data, Date.now())
    return data;
}

async function fetchNewData() {
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

    // Return Cathed data from local storage
    if (cached) {
        const { data, time } = JSON.parse(cached);
        const isValid = (Date.now() - time) < STORAGE_DURATION;

        if (isValid)
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
function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12, 0, 0, 0); return d.toISOString(); }

/********************\n     * Helpers\n     ********************/
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const todayISO = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.toISOString(); };

const PRIORITY_BADGE = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
};

const STATUS_LABEL = { W: 'to-do', P: 'in_progress', C: 'done' };
const PRIORITY_LABEL = { H: 'High', M: 'Medium', L: 'Low' };

/********************\n     * Rendering\n     ********************/
async function renderAll() {
    let data = null;
    try {
        data = await state();
    } catch (exp) {
        console.log(exp);
        return;
    }

    renderStats();
    renderTasks();
    renderKanbanPreview();
    renderCategories();
    renderCalendar();
    $('#userName').textContent = data.user.name;
    $('#userEmail').textContent = data.user.email;
    $('#countAll').textContent = data.tasks.length;
    saveStateIntoCache(data, Date.now());
}

async function renderStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = await state();

    const dueToday = data.tasks.filter(t => sameDay(new Date(t.reminder.split('T')[0]), today) && !t.completed).length;
    const overdue = data.tasks.filter(t => new Date(t.reminder.split('T')[0]) < today && !t.completed).length;
    const done = data.tasks.filter(t => t.completed).length;
    $('#statToday').textContent = dueToday;
    $('#statOverdue').textContent = overdue;
    $('#statDone').textContent = done;
    $('#statCategories').textContent = data.categories.length;
}

function sameDay(a, b) {
    return a.getFullYear() == b.getFullYear()
        && a.getMonth() == b.getMonth() && a.getDate() == b.getDate();
}


// Convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Calculate luminance to determine if color is light or dark
function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Get optimal text color (white or dark gray)
function getTextColor(bgColor) {
    const rgb = hexToRgb(bgColor);
    if (!rgb)
        return '#FFFFFF';

    const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
    return luminance > 0.5 ? '#1F2937' : '#FFFFFF';
}


async function taskItemTemplate(t) {
    const data = await state();
    const cat = data.categories.find(c => c.id === t.category);

    return `
      <li class="py-3 flex gap-3">
        <input type="checkbox" ${t.completed ? 'checked' : ''} data-action="toggle-complete" data-id="${t.id}" class="mt-2 w-4 h-4 rounded border-gray-300">
        <div class="flex-1 min-w-0">
          <div class="flex items-start gap-2">
            <h4 class="font-medium truncate">${t.title}</h4>
            <span class="text-xs rounded-full px-2 py-0.5 ${PRIORITY_BADGE[t.priority]}">${t.priority}</span>
            <span class="inline-flex font-bold items-center text-xs rounded-full px-3 py-1 " 
                  style="background-color: ${cat.color}; color: ${getTextColor(cat.color)}">
              ${cat.title || ''}
            </span>
          </div>
          <p class="text-sm text-gray-500 line-clamp-2">${t.description || ''}</p>
          <div class="mt-1 text-xs text-gray-500 flex items-center gap-3">
            <span>⏰ ${fmtDate(t.reminder)}</span>
            <span>🌱 ${STATUS_LABEL[t.status]}</span>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button class="px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" data-action="edit" data-id="${t.id}">✏️</button>
          <button class="px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" data-action="move" data-id="${t.id}">↔️</button>
          <button class="px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600" data-action="delete" data-id="${t.id}">🗑️</button>
        </div>
      </li>`;
}


async function renderTasks(filter = null) {
    const ul = $('#taskList');
    const data = await state();
    let items = [...data.tasks];

    const q = $('#searchInput')?.value?.trim().toLowerCase();
    if (q)
        items = items.filter(t => [t.title, t.description, t.tags?.join(' ')].join(' ').toLowerCase().includes(q));
    if (filter && filter !== 'all')
        items = items.filter(t => t.status === filter);
    const sort = $('#sortSelect').value;
    items.sort((a, b) => {
        if (sort === 'due_asc') return new Date(a.reminder) - new Date(b.reminder);
        if (sort === 'due_desc') return new Date(b.reminder) - new Date(a.reminder);
        if (sort === 'priority') { const order = { high: 0, medium: 1, low: 2 }; return order[a.priority] - order[b.priority]; }
        if (sort === 'status') { const order = { todo: 0, in_progress: 1, review: 2, done: 3 }; return order[a.status] - order[b.status]; }
        return 0;
    });

    Promise.all(items.map(t => taskItemTemplate(t))).then(result => {
        ul.innerHTML = result.join('');
    })

    $('#emptyTasks').classList.toggle('hidden', items.length > 0);
}

async function renderKanbanPreview() {
    const data = await state();
    const buckets = { todo: '#kanbanTodo', in_progress: '#kanbanProgress', review: '#kanbanReview', done: '#kanbanDone' };
    Object.entries(buckets).forEach(([st, sel]) => { $(sel).innerHTML = data.tasks.filter(t => t.status === st).slice(0, 3).map(t => `<li class="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-800">${t.title}</li>`).join('') || '<div class="text-xs text-gray-400">No items</div>'; });
}

async function renderCategories() {
    const data = await state();
    const wrap = $('#categoryGrid');
    wrap.innerHTML = data.categories.map(c => `
        <button class="group p-3 rounded-xl border border-gray-200 dark:border-gray-800 text-left hover:shadow-soft" data-cat="${c.id}">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" style="background:${c?.color}"></span>
            <span class="font-medium">${c.title}</span>
            <span class="ml-auto text-xs text-gray-500">${data.tasks.filter(t => t.category === c.id).length}</span>
          </div>
        </button>
      `).join('');
}

/********************\n     * Calendar (very small helper)\n     ********************/
let cal = new Date();
async function renderCalendar() {
    const data = await state();
    const year = cal.getFullYear(); const month = cal.getMonth();
    $('#calTitle').textContent = cal.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const first = new Date(year, month, 1); const last = new Date(year, month + 1, 0);
    const grid = $('#calendarGrid'); grid.innerHTML = '';
    const startWeekday = (first.getDay() + 6) % 7; // Monday=0
    for (let i = 0; i < startWeekday; i++) grid.appendChild(document.createElement('div'));
    for (let d = 1; d <= last.getDate(); d++) {
        const dayDate = new Date(year, month, d, 12);
        const count = data.tasks.filter(t => sameDay(new Date(t.reminder), dayDate)).length;
        const cell = document.createElement('button');
        cell.className = 'p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800';
        cell.innerHTML = `<div class="text-xs text-gray-500">${d}</div>${count ? `<div class='mt-1 text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'>${count} tasks</div>` : ''}`;
        grid.appendChild(cell);
    }
}

/********************\n     * Modals (New/Edit Task, Category)\n     ********************/

async function openModal({ title, bodyHTML, onSubmit }) {
    const overlay = $('#modalOverlay');
    overlay.innerHTML = '';

    const tpl = document.importNode($('#modalTemplate').content, true);
    tpl.querySelector('#modalTitle').textContent = title;

    const body = tpl.querySelector('#modalBody');
    body.innerHTML = (await bodyHTML);

    const primary = tpl.querySelector('#modalPrimary');
    primary.onclick = () => { if (onSubmit?.() !== false) closeModal(); };
    tpl.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModal));
    overlay.appendChild(tpl);
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    // focus first input
    setTimeout(() => overlay.querySelector('input,textarea,select,button')?.focus(), 0);
}

function closeModal() {
    const overlay = $('#modalOverlay');
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '';
}

async function taskForm(t = {}) {
    const catOpts = (await state()).categories.map(c => `<option value="${c.id}" ${t.category === c.id ? 'selected' : ''}>${c.title}</option>`).join('');
    const statusOpts = Object.entries(STATUS_LABEL).map(([label, value]) => `<option ${t.status === label ? 'selected' : ''} value="${label}">${value}</option>`).join('');
    console.log(t.proirity);
    const priorityOpts = Object.entries(PRIORITY_LABEL).map(([label, value]) => `<option ${t.proirity === label ? 'selected' : ''} value="${label}">${value}</option>`).join('');

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="text-sm text-gray-500">Title</label>
            <input id="f-title" class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" value="${t.title || ''}"/>
          </div>
          <div>
            <label class="text-sm text-gray-500">Due Date</label>
            <input id="f-due" type="date" class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" value="${t.reminder ? new Date(t.reminder).toISOString().slice(0, 10) : ''}"/>
          </div>
          <div>
            <label class="text-sm text-gray-500">Priority</label>
            <select id="f-priority" class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">${priorityOpts}</select>
          </div>
          <div>
            <label class="text-sm text-gray-500">Status</label>
            <select id="f-status" class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">${statusOpts}</select>
          </div>
          <div class="md:col-span-2">
            <label class="text-sm text-gray-500">Category</label>
            <select id="f-category" class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">${catOpts}</select>
          </div>
          <div class="md:col-span-2">
            <label class="text-sm text-gray-500">Description</label>
            <textarea id="f-desc" rows="3" class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">${t.description || ''}</textarea>
          </div>
        </div>`;
}


async function openNewTask() {
    const data = await state();

    openModal({
        title: 'New Task',
        bodyHTML: taskForm(
            {
                status: 'to-do',
                priority: 'h',
                category: data.categories[0].id,
                due: new Date().toISOString()
            }
        ),
        onSubmit() {
            const t = {
                title: $('#f-title').value.trim(),
                description: $('#f-desc').value.trim(),
                category: $('#f-category').value,
                reminder: (new Date()).toISOString(),
                status: $('#f-status').value.trim(),
                proirity: $('#f-priority').value
            };
            if (!t.title) {
                toast('Title is required', 'error');
                return false;
            }
            try {
                console.log(t.proirity);
                console.log(t.status);
                createTask(t);
                fetchNewData();
                renderAll();
                toast('Task created');
            } catch (e) {
                console.log(e);
            }
        }
    });
}

async function openEditTask(id) {
    const tasks = (await state()).tasks;
    const t = tasks.find(x => x.id == id);
    if (!t)
        return;
    openModal({
        title: 'Edit Task',
        bodyHTML: taskForm(t),
        onSubmit() {
            t.title = $('#f-title').value.trim();
            t.description = $('#f-desc').value.trim();
            t.category = $('#f-category').value;
            if ($('#f-due').value !== "")
                t.reminder = new Date($('#f-due').value).toISOString();
            t.status = $('#f-status').value.trim();
            t.priority = $('#f-priority').value;
            updateTask(t, id);
            fetchNewData();
            renderAll();
            toast('Task Updated');
        }
    });
}

async function openNewCategory() {
    const categories = (await state()).categories;
    openModal({
        title: 'New Category',
        bodyHTML: `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="md:col-span-2">
            <label class="text-sm text-gray-500">Name</label>
            <input id="c-name" class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"/>
          </div>
          <div>
            <label class="text-sm text-gray-500">Color</label>
            <input id="c-color" type="color" value="#6366f1" class="mt-1 w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"/>
          </div>
        </div>`, onSubmit() {
            const name = $('#c-name').value.trim();
            const color = $('#c-color').value;
            if (!name) {
                toast('Name is required', 'error');
                return false;
            }
            /// must be completed
            createCategories(
                {
                    title: name.toLowerCase(),
                    color: color
                });
            fetchNewData();
            renderAll();
            toast('Category Added');
        }
    });
}

/********************\n     * Drag & Drop (Kanban Full)\n     ********************/
async function renderKanbanFull() {
    $$('#route-kanban .kanban-drop').forEach(drop => drop.innerHTML = '');
    await state().tasks.forEach(t => {
        const card = document.createElement('div');
        card.className = 'draggable px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-move';
        card.draggable = true; card.dataset.id = t.id;
        card.innerHTML = `<div class="flex items-center justify-between"><span class="font-medium">${t.title}</span><span class="text-xs px-2 py-0.5 rounded ${PRIORITY_BADGE[t.priority]}">${t.priority}</span></div><div class="text-xs text-gray-500">${fmtDate(t.reminder)} • ${state.categories.find(c => c.id === t.category)?.name || ''}</div>`;
        const col = $(`#route-kanban .kanban-col[data-status="${t.status}"] .kanban-drop`);
        col?.appendChild(card);
    });
    enableDnD();
}

function enableDnD() {
    $$('.draggable').forEach(el => {
        el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', el.dataset.id); el.classList.add('dragging'); });
        el.addEventListener('dragend', () => el.classList.remove('dragging'));
    });
    $$('#route-kanban .kanban-drop').forEach(drop => {
        drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('ring-2', 'ring-brand-500'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('ring-2', 'ring-brand-500'));
        drop.addEventListener('drop', e => {
            e.preventDefault(); drop.classList.remove('ring-2', 'ring-brand-500');
            const id = Number(e.dataTransfer.getData('text/plain'));
            const col = drop.closest('.kanban-col'); const st = col.dataset.status;
            const t = state.tasks.find(x => x.id === id); if (t) { t.status = st; renderAll(); renderKanbanFull(); toast('Task moved'); }
        });
    });
}

/********************\n     * Toasts\n     ********************/
function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `px-4 py-2 rounded-xl shadow-soft border ${type === 'error' ? 'border-red-300 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200' : 'border-gray-200 bg-white dark:bg-gray-900'}`;
    el.textContent = msg;
    $('#toastStack').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.transition = 'all .3s'; setTimeout(() => el.remove(), 300); }, 1800);
}

/********************\n     * Routing (simple)\n     ********************/
function routeTo(name) {
    ['dashboard', 'kanban', 'tasks', 'calendar', 'categories', 'settings'].forEach(r => $('#route-' + r).classList.add('hidden'));
    $('#route-' + name).classList.remove('hidden');
    $$('.nav-link').forEach(a => a.classList.toggle('bg-brand-50', a.dataset.nav === name));
    if (name === 'kanban') renderKanbanFull();
}

/********************\n     * Event Wiring\n     ********************/
async function wire() {
    // Nav
    $$('.nav-link').forEach(a => a.addEventListener('click', e => { e.preventDefault(); routeTo(a.dataset.nav); }));

    // Search
    $('#searchInput')?.addEventListener('input', () => renderTasks());

    // Filters
    $('[data-filter="todo"]').addEventListener('click', () => renderTasks('todo'));
    $('[data-filter="in_progress"]').addEventListener('click', () => renderTasks('in_progress'));
    $('[data-filter="review"]').addEventListener('click', () => renderTasks('review'));
    $('[data-filter="done"]').addEventListener('click', () => renderTasks('done'));
    $('#filterAll').addEventListener('click', () => renderTasks('all'));
    $('#sortSelect').addEventListener('change', () => renderTasks());

    // Add/Edit/Delete actions (event delegation)
    $('#taskList').addEventListener('click', e => {
        const btn = e.target.closest('button, input[type="checkbox"]'); if (!btn) return;
        const id = btn.dataset.id;
        if (btn.dataset.action === 'edit') openEditTask(id);
        if (btn.dataset.action === 'delete') {
            state.tasks = state.tasks.filter(t => t.id != id);
            deleteTask(id);
            renderAll();
            toast('Task deleted');
        }
        if (btn.dataset.action === 'move') { const t = state.tasks.find(x => x.id == id); t.status = nextStatus(t.status); renderAll(); toast('Moved to ' + STATUS_LABEL[t.status]); }
        if (btn.dataset.action === 'toggle-complete') { const t = state.tasks.find(x => x.id == id); t.completed = btn.checked; if (t.completed) t.status = 'done'; renderAll(); }
    });

    // New Task/Category buttons
    $('#newTaskBtn').addEventListener('click', openNewTask);
    $('#addTaskTop').addEventListener('click', openNewTask);
    $('#newCategoryBtn').addEventListener('click', openNewCategory);
    $('#addCategoryTop').addEventListener('click', openNewCategory);

    // Calendar nav
    $('#prevMonth').addEventListener('click', () => { cal.setMonth(cal.getMonth() - 1); renderCalendar(); });
    $('#nextMonth').addEventListener('click', () => { cal.setMonth(cal.getMonth() + 1); renderCalendar(); });

    // Notes
    $('#saveNotes').addEventListener('click', () => { state.notes = $('#quickNotes').value; saveState(); toast('Notes saved'); });
    $('#quickNotes').value = state.notes || '';

    // Sidebar responsive
    $('#openSidebar').addEventListener('click', () => $('#sidebar').classList.remove('hidden'));
    $('#closeSidebar').addEventListener('click', () => $('#sidebar').classList.add('hidden'));

    // Theme toggle + shortcuts
    $('#themeToggle').addEventListener('click', toggleTheme);
    document.addEventListener('keydown', (e) => {
        if (e.key === '/') { e.preventDefault(); $('#searchInput')?.focus(); }
        if (e.key.toLowerCase() === 'n') openNewTask();
        if (e.key.toLowerCase() === 'd') toggleTheme();
    });

    // Route links
    $('[data-nav="kanban"]').addEventListener('click', () => routeTo('kanban'));
}

function nextStatus(s) { return s === 'todo' ? 'in_progress' : s === 'in_progress' ? 'review' : s === 'review' ? 'done' : 'todo'; }

function toggleTheme() {
    const html = document.documentElement; html.classList.toggle('dark');
}

/********************\n     * Bootstrap\n     ********************/
document.addEventListener('DOMContentLoaded', () => { wire(); renderAll(); });