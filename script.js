import { getTasks, createTask, updateTask, deleteTask, getCategories, createCategories, updateCategories } from "./utills.js";
import { render_mono_category, taskItemTemplate, renderCategories, taskForm, openNewCategory, openEditTask, openNewTask, closeModal, openModal, taskItemTemplate_complete } from "./renderTemplates.js";
import {
    PRIORITY_BADGE, STATUS_LABEL, STATUS_LABEL_Array, PRIORITY_LABEL, GetStatusLabel, $, $$, fmtDate, sameDay,
    todayISO, getTextColor, taskDone, hexToRgb, getLuminance
    , fetchState, getCachdData, saveStateIntoCache, fetchNewData, state
} from "./sharedData.js";
import { logged_in, logout_user, navigate_login } from "./user.js";
export { renderAll }


// Tailwind config
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


/********************
 * Test Logics Here *
 ********************/



/*******************
 * Rendering Logic *
 *******************/
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

    const dueToday = data.tasks.filter(t => sameDay(new Date(t.reminder.split('T')[0]), today) && !taskDone(t)).length;
    const overdue = data.tasks.filter(t => new Date(t.reminder.split('T')[0]) < today && !taskDone(t)).length;
    const done = data.tasks.filter(t => taskDone(t)).length;
    $('#statToday').textContent = dueToday;
    $('#statOverdue').textContent = overdue;
    $('#statDone').textContent = done;
    $('#statCategories').textContent = data.categories.length;
}


async function renderTasks(filter = null) {
    const ul = $('#taskList');
    const data = await state();
    let items = [...data.tasks];

    const q = $('#searchInput')?.value?.trim().toLowerCase();
    if (q)
        items = items.filter(t => [t.title, t.description, t.tags?.join(' ')].join(' ').toLowerCase().includes(q));
    if (filter && filter !== 'all')
        items = items.filter(t => STATUS_LABEL[t.status] == filter);
    const sort = $('#sortSelect').value;
    items.sort((a, b) => {
        if (sort === 'due_asc') return (new Date(a.reminder) - new Date(b.reminder));
        if (sort === 'due_desc') return (new Date(b.reminder) - new Date(a.reminder));
        if (sort === 'priority') { const order = { high: 0, medium: 1, low: 2 }; return order[a.proirity] - order[b.proirity]; }
        if (sort === 'status') {
            let order = {};
            for (let i = 0; i < STATUS_LABEL_Array.length; i++)
                order[STATUS_LABEL_Array[i]] = i;
            return order[a.status] - order[b.status];
        }
        return 0;
    });

    Promise.all(items.map(t => taskItemTemplate(data, t, taskDone))).then(result => {
        ul.innerHTML = result.join('');
    })

    $('#emptyTasks').classList.toggle('hidden', items.length > 0);
}

async function renderKanbanPreview() {
    const data = await state();
    const buckets = { toDo: '#kanbanTodo', inProgress: '#kanbanProgress', Done: '#kanbanDone' };
    Object.entries(buckets).forEach(([st, sel]) => {
        let count = data.tasks.filter(t => STATUS_LABEL[t.status] == st).length;
        $(sel).innerHTML = count;
    });
}


/********************
 * Calendar
 ********************/
let cal = new Date();
async function renderCalendar() {
    const data = await state();
    const year = cal.getFullYear();
    const month = cal.getMonth();
    $('#calTitle').textContent = cal.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const grid = $('#calendarGrid');
    grid.innerHTML = '';
    const startWeekday = (first.getDay() + 6) % 7;
    for (let i = 0; i < startWeekday; i++)
        grid.appendChild(document.createElement('div'));
    for (let d = 1; d <= last.getDate(); d++) {
        const dayDate = new Date(year, month, d, 12);
        const count = data.tasks.filter(t => sameDay(new Date(t.reminder), dayDate)).length;
        const cell = document.createElement('button');
        cell.className = 'group relative p-3 rounded-xl border border-gray-200/60 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md dark:hover:shadow-gray-900/50 transition-all duration-200 bg-white dark:bg-gray-800/50 hover:bg-gradient-to-br hover:from-gray-50 hover:to-white dark:hover:from-gray-800 dark:hover:to-gray-800/80 backdrop-blur-sm';
        cell.innerHTML = `<div class="font-semibold text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">${d}</div>${count ? `<div class='mt-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm dark:shadow-blue-500/20'>${count}</div>` : ''}`;
        grid.appendChild(cell);
    }
}

/********************
 * Modals
 ********************/
// Import them from 'renderTemplates.js', for clean coding


/********************
 * Drag & Drop (Kanban)
 ********************/
async function renderKanbanFull() {
    $$('#route-kanban .kanban-drop').forEach(drop => drop.innerHTML = '');
    const data = await state();
    data.tasks.forEach(t => {
        const card = document.createElement('div');
        card.className = 'draggable px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-move hover:shadow-lg transition-all duration-200';
        card.draggable = true;
        card.dataset.id = t.id;
        card.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <span class="font-semibold text-sm">${t.title}</span>
                <span class="text-xs font-bold px-2.5 py-1 rounded-lg ${PRIORITY_BADGE[t.proirity]}">${t.proirity}</span>
            </div>
            <div class="text-xs text-gray-500 flex items-center gap-2">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                ${fmtDate(t.reminder)}
                <span>•</span>
                ${data.categories.find(c => c.id === t.category)?.title || ''}
            </div>`;
        const col = $(`#route-kanban .kanban-col[data-status="${STATUS_LABEL[t.status]}"] .kanban-drop`);
        col?.appendChild(card);
    });
    enableDnD();
}

async function enableDnD() {
    const data = await state();
    $$('.draggable').forEach(el => {
        el.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', el.dataset.id);
            el.classList.add('opacity-50');
        });
        el.addEventListener('dragend', () => el.classList.remove('opacity-50'));
    });
    $$('#route-kanban .kanban-drop').forEach(drop => {
        drop.addEventListener('dragover', e => {
            e.preventDefault();
            drop.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
        });
        drop.addEventListener('dragleave', () => {
            drop.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
        });
        drop.addEventListener('drop', async e => {
            e.preventDefault();
            drop.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
            const id = Number(e.dataTransfer.getData('text/plain'));
            const col = drop.closest('.kanban-col');
            const st = GetStatusLabel(col.dataset.status);
            const t = data.tasks.find(x => x.id === id);
            if (t) {
                t.status = st.trim();
                await updateTask(t, id);
                await fetchNewData();
                await renderAll();
                await renderKanbanFull();
                toast('Task moved to ' + col.dataset.status);
            }
        });
    });
}

/********************
 *    Tasks Panel   *  
 ********************/

// DOM Element References
const TasksPanelElements = {
    // Main containers
    tasksList: document.getElementById('allTasksList'),
    emptyState: document.getElementById('emptyAllTasks'),
    taskCount: document.getElementById('taskCount'),

    // Filter elements
    statusFilters: document.querySelectorAll('[data-filter-status]'),
    priorityFilters: document.querySelectorAll('[data-filter-priority]'),
    dateFilters: document.querySelectorAll('[data-filter-date]'),
    categoryFilters: document.getElementById('categoryFilterList'),
    clearFiltersBtn: document.getElementById('clearAllFilters'),

    // Sort dropdown
    sortDropdown: document.getElementById('sortTasksView')
};

/**
 * Task Actions Handler
 * Handles all task-related actions (edit, delete, move, toggle completion)
 */
const TaskActions = {
    async handleEdit(taskId) {
        openEditTask(taskId);
    },

    async handleDelete(taskId) {
        const data = await state();
        data.tasks = data.tasks.filter(t => t.id != taskId);

        await deleteTask(taskId);
        await fetchNewData();
        await renderAll();

        toast('Task deleted successfully');
    },

    async handleMove(taskId) {
        const data = await state();
        const task = data.tasks.find(t => t.id == taskId);

        if (!task) return;

        task.status = nextStatus(task.status);

        await updateTask(task, taskId);
        await fetchNewData();
        await renderAll();

        toast(`Moved to ${STATUS_LABEL[task.status]}`);
    },

    async handleToggleComplete(taskId, isChecked) {
        const data = await state();
        const task = data.tasks.find(t => t.id == taskId);

        if (!task) return;

        task.status = GetStatusLabel(isChecked ? 'Done' : 'inProgress');

        await updateTask(task, taskId);
        await fetchNewData();
        await renderAll();
    },

    async handleTitleEdit(taskId, newTitle) {
        const data = await state();
        const task = data.tasks.find(t => t.id == taskId);

        if (!task) return;

        task.title = newTitle;

        await updateTask(task, taskId);
        await fetchNewData();
        await renderAll();
    }
};

/**
 * Filter Manager
 * Extracts and manages active filters
 */
const FilterManager = {
    getActiveStatusFilters() {
        return Array.from(TasksPanelElements.statusFilters)
            .filter(filter => filter.checked)
            .map(filter => GetStatusLabel(filter.dataset.filterStatus));
    },

    getActivePriorityFilters() {
        return Array.from(TasksPanelElements.priorityFilters)
            .filter(filter => filter.checked)
            .map(filter => filter.dataset.filterPriority.charAt(0).toUpperCase());
    },

    getActiveDateFilters() {
        return Array.from(TasksPanelElements.dateFilters)
            .filter(filter => filter.checked)
            .map(filter => filter.dataset.filterDate);
    },


    getActiveCategoryFilters() {
        const categoryButtons = TasksPanelElements.categoryFilters.querySelectorAll('button[data-cat]');
        return Array.from(categoryButtons)
            .filter(btn => btn.classList.contains('active'))
            .map(btn => btn.dataset.cat);
    },

    applyFilters(tasks) {
        const statusFilters = this.getActiveStatusFilters();
        const priorityFilters = this.getActivePriorityFilters();
        const dateFilters = this.getActiveDateFilters();
        const categoryFilters = this.getActiveCategoryFilters();

        let filteredTasks = [...tasks];

        // Apply status filters
        if (statusFilters.length > 0) {
            filteredTasks = filteredTasks.filter(task => statusFilters.includes(task.status));
        }

        // Apply priority filters
        if (priorityFilters.length > 0) {
            filteredTasks = filteredTasks.filter(task =>
                priorityFilters.includes(task.proirity?.charAt(0)?.toUpperCase())
            );
        }

        // Apply date filters
        if (dateFilters.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            filteredTasks = filteredTasks.filter(task => {
                const taskDate = new Date(task.reminder);
                taskDate.setHours(0, 0, 0, 0);

                return dateFilters.some(filter => {
                    switch (filter) {
                        case 'today':
                            return taskDate.getTime() === today.getTime();

                        case 'week':
                            const weekFromNow = new Date(today);
                            weekFromNow.setDate(weekFromNow.getDate() + 7);
                            return taskDate >= today && taskDate <= weekFromNow;

                        case 'month':
                            const monthFromNow = new Date(today);
                            monthFromNow.setDate(monthFromNow.getDate() + 30);
                            return taskDate >= today && taskDate <= monthFromNow;

                        case 'overdue':
                            return taskDate < today;

                        default:
                            return true;
                    }
                });
            });
        }

        // Apply category filters
        if (categoryFilters.length > 0) {
            filteredTasks = filteredTasks.filter(task => categoryFilters.includes(task.category));
        }

        return filteredTasks;
    }
};

/**
 * Task Sorter
 * Handles sorting logic for tasks
 */
const TaskSorter = {
    sortTasks(tasks, sortType) {
        const sortedTasks = [...tasks];

        const sortFunctions = {
            due_asc: (a, b) => new Date(a.reminder) - new Date(b.reminder),
            due_desc: (a, b) => new Date(b.reminder) - new Date(a.reminder),
            priority: (a, b) => {
                const order = { high: 0, medium: 1, low: 2 };
                return (order[a.proirity] ?? 3) - (order[b.proirity] ?? 3);
            },
            status: (a, b) => {
                const order = {};
                STATUS_LABEL_Array.forEach((status, index) => {
                    order[status] = index;
                });
                return (order[a.status] ?? 999) - (order[b.status] ?? 999);
            }
        };

        const sortFunction = sortFunctions[sortType];
        if (sortFunction) {
            sortedTasks.sort(sortFunction);
        }

        return sortedTasks;
    }
};

/**
 * Event Handlers
 * Manages all event listeners for the tasks panel
 */
function wireTasksPanel() {
    const { tasksList, sortDropdown, statusFilters, priorityFilters, dateFilters, categoryFilters, clearFiltersBtn } = TasksPanelElements;

    // Sort dropdown change
    sortDropdown?.addEventListener('change', () => {
        listAllTasks();
    });

    // Status filter changes
    statusFilters.forEach(filter => {
        filter.addEventListener('change', () => {
            listAllTasks();
        });
    });

    // Priority filter changes
    priorityFilters.forEach(filter => {
        filter.addEventListener('change', () => {
            listAllTasks();
        });
    });

    // Date filter changes
    dateFilters.forEach(filter => {
        filter.addEventListener('change', () => {
            listAllTasks();
        });
    });

    // Category filter clicks (delegated event)
    categoryFilters?.addEventListener('click', (e) => {
        const categoryBtn = e.target.closest('button[data-cat]');
        if (categoryBtn) {
            categoryBtn.classList.toggle('active');
            listAllTasks();
        }
    });

    // Clear all filters
    clearFiltersBtn?.addEventListener('click', () => {
        // Uncheck all filters
        statusFilters.forEach(filter => filter.checked = false);
        priorityFilters.forEach(filter => filter.checked = false);
        dateFilters.forEach(filter => filter.checked = false);

        // Remove active class from category buttons
        const categoryButtons = categoryFilters?.querySelectorAll('button[data-cat]');
        categoryButtons?.forEach(btn => btn.classList.remove('active'));

        listAllTasks();
    });

    // Task title editing (focusout)
    tasksList?.addEventListener('focusout', async (e) => {
        const titleElement = e.target.closest('h4[contenteditable="true"]');

        if (titleElement?.dataset.id) {
            const taskId = titleElement.dataset.id;
            const newTitle = titleElement.textContent.trim();

            if (newTitle) {
                await TaskActions.handleTitleEdit(taskId, newTitle);
            }
        }
    });

    // Task title editing (Enter key)
    tasksList?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.hasAttribute('contenteditable')) {
            e.preventDefault();
            e.target.blur();
        }
    });

    // Task actions (edit, delete, move, toggle)
    tasksList?.addEventListener('click', async (e) => {
        const actionElement = e.target.closest('button[data-action], input[type="checkbox"][data-action]');

        if (!actionElement?.dataset.id) return;

        const taskId = actionElement.dataset.id;
        const action = actionElement.dataset.action;

        switch (action) {
            case 'edit':
                await TaskActions.handleEdit(taskId);
                break;
            case 'delete':
                await TaskActions.handleDelete(taskId);
                break;
            case 'move':
                await TaskActions.handleMove(taskId);
                break;
            case 'toggle-complete':
                await TaskActions.handleToggleComplete(taskId, actionElement.checked);
                break;
        }
    });
}

/**
 * Loads category filters into the panel
 */
async function fillPanelsOption() {
    const data = await state();
    const { categories } = data;
    const { categoryFilters } = TasksPanelElements;

    if (!categoryFilters) return;

    if (!categories || categories.length === 0) {
        categoryFilters.innerHTML = '<p class="col-span-full text-xs text-gray-400 dark:text-gray-500 px-3 py-2">No categories yet</p>';
        return;
    }

    try {
        const categoryHTML = await Promise.all(
            categories.map(category => render_mono_category(category))
        );

        categoryFilters.innerHTML = categoryHTML.join('');
    } catch (error) {
        console.error('Error loading categories:', error);
        categoryFilters.innerHTML = '<p class="col-span-full text-xs text-red-400 px-3 py-2">Error loading categories</p>';
    }
}

/**
 * Lists and renders all tasks with applied filters and sorting
 */
async function listAllTasks() {
    const data = await state();
    let tasks = data.tasks;

    const { tasksList, emptyState, taskCount, sortDropdown } = TasksPanelElements;

    // Show empty state if no tasks exist
    if (!tasks || tasks.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (tasksList) tasksList.innerHTML = '';
        if (taskCount) taskCount.textContent = '0';
        return;
    }

    // Hide empty state
    if (emptyState) emptyState.classList.add('hidden');

    // Apply filters
    const filteredTasks = FilterManager.applyFilters(tasks);

    // Apply sorting
    const sortType = sortDropdown?.value || 'due_asc';
    const sortedTasks = TaskSorter.sortTasks(filteredTasks, sortType);

    // Update task count
    if (taskCount) {
        taskCount.textContent = sortedTasks.length;
    }

    // Render tasks
    if (tasksList) {
        if (sortedTasks.length === 0) {
            tasksList.innerHTML = '<li class="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">No tasks match the selected filters</li>';
        } else {
            try {
                const tasksHTML = await Promise.all(
                    sortedTasks.map(task => taskItemTemplate_complete(data, task, taskDone))
                );
                tasksList.innerHTML = tasksHTML.join('');
            } catch (error) {
                console.error('Error rendering tasks:', error);
                tasksList.innerHTML = '<li class="col-span-full text-center py-12 text-red-400">Error loading tasks</li>';
            }
        }
    }
}

/**
 * Initializes the tasks panel
 */
async function renderTasksPanel() {
    await fillPanelsOption();
    wireTasksPanel();
    await listAllTasks();
}


async function calendarViewPanel() {

}


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
 * Routing
 ********************/
function routeTo(name) {
    ['dashboard', 'kanban', 'tasks', 'calendar', 'categories', 'settings'].forEach(r => $('#route-' + r).classList.add('hidden'));
    $('#route-' + name).classList.remove('hidden');
    $$('.nav-link').forEach(a => {
        if (a.dataset.nav === name)
            a.classList.add('bg-gradient-to-r', 'from-blue-50', 'to-indigo-50', 'dark:from-gray-800', 'dark:to-gray-800/50');
        else
            a.classList.remove('bg-gradient-to-r', 'from-blue-50', 'to-indigo-50', 'dark:from-gray-800', 'dark:to-gray-800/50');
    });
    switch (name) {
        case 'kanban':
            renderKanbanFull();
            break;

        case 'tasks':
            renderTasksPanel();
            break;

        case 'calendar':
            calendarViewPanel();
            break;

        default:
            break;
    }

}

/********************
 * Event Wiring
 ********************/
async function wire() {
    $$('.nav-link').forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        routeTo(a.dataset.nav);
    }));

    $('#searchInput')?.addEventListener('input', () => renderTasks());


    Object.entries(STATUS_LABEL).forEach(x => {
        const label = x[1];
        const property = $(`[data-filter="${label}"]`);
        property.addEventListener('click', () => renderTasks(label));
    })

    $('#filterAll').addEventListener('click', () => renderTasks('all'));
    $('#sortSelect').addEventListener('change', () => renderTasks());

    $('#taskList').addEventListener('focusout', async e => {
        const data = await state();
        const txtTitle = e.target.closest('h4');
        if (txtTitle && txtTitle.dataset.id) {
            const id = txtTitle.dataset.id;
            const t = data.tasks.find(x => x.id == id);
            t.title = txtTitle.textContent;
            await updateTask(t, id);
            await fetchNewData();
            await renderAll();
        }
    })

    $('#taskList').addEventListener('keydown', async e => {
        if (e.key == 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
    })

    $('#taskList').addEventListener('click', async e => {
        const data = await state();
        const btn = e.target.closest('button, input[type="checkbox"]');

        if (btn) {
            const id = btn.dataset.id;
            if (btn.dataset.action === 'edit')
                openEditTask(id);
            if (btn.dataset.action === 'delete') {
                data.tasks = data.tasks.filter(t => t.id != id);
                await deleteTask(id);
                await fetchNewData();
                await renderAll();
                toast('Task deleted successfully');
            }
            if (btn.dataset.action === 'move') {
                const t = data.tasks.find(x => {
                    console.log(x.id, id);
                    return x.id == id
                });
                t.status = nextStatus(t.status);
                await updateTask(t, id)
                await fetchNewData();
                await renderAll();
                toast('Moved to ' + STATUS_LABEL[t.status]);
            }
            if (btn.dataset.action === 'toggle-complete') {
                const t = data.tasks.find(x => x.id == id);
                t.status = GetStatusLabel(btn.checked ? 'Done' : 'inProgress');
                await updateTask(t, id);
                await fetchNewData()
                await renderAll();
            }
        }
    });

    $('#newTaskBtn').addEventListener('click', openNewTask);
    $('#addTaskTop').addEventListener('click', openNewTask);
    $('#newCategoryBtn').addEventListener('click', openNewCategory);
    $('#addCategoryTop').addEventListener('click', openNewCategory);

    $('#prevMonth').addEventListener('click', () => { cal.setMonth(cal.getMonth() - 1); renderCalendar(); });
    $('#nextMonth').addEventListener('click', () => { cal.setMonth(cal.getMonth() + 1); renderCalendar(); });

    $('#saveNotes').addEventListener('click', () => { state.notes = $('#quickNotes').value; saveState(); toast('Notes saved successfully'); });
    $('#quickNotes').value = state.notes || '';

    $('#openSidebar').addEventListener('click', () => $('#sidebar').classList.remove('hidden'));
    $('#closeSidebar').addEventListener('click', () => $('#sidebar').classList.add('hidden'));

    $('#themeToggle').addEventListener('click', toggleTheme);

    $('#logoutBtn').addEventListener('click', logout);

    document.addEventListener('keydown', (e) => {
        if (e.key === '/') { e.preventDefault(); $('#searchInput')?.focus(); }
        if (e.key.toLowerCase() === 'n') openNewTask();
        if (e.key.toLowerCase() === 'd') toggleTheme();
    });

    $('[data-nav="kanban"]').addEventListener('click', () => routeTo('kanban'));
}

function nextStatus(s) {
    const length = Object.entries(STATUS_LABEL).length
    for (let i = 0; i < length; i++) {
        const currentStatus = Object.entries(STATUS_LABEL)[i];
        if (s == currentStatus[0]) {
            if (i == length - 1)
                return s
            return Object.entries(STATUS_LABEL)[i + 1][0]
        }
    }
    return null
}

function toggleTheme() {
    const html = document.documentElement;
    html.classList.toggle('dark');
    localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
}

function logout() {
    logout_user();
}



/********************
 * Bootstrap
 ********************/
document.addEventListener('DOMContentLoaded', () => {
    if (!logged_in()) {
        navigate_login();
        return;
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    }
    wire();
    renderAll();


    // Test garbage functionalities here(remove them after you're done with them)
    routeTo('tasks')
});