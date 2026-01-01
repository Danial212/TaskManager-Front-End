import { getTasks, createTask, updateTask, deleteTask, getCategories, createCategories, updateCategories } from "./utills.js";
import { render_mono_category, render_mono_calander_day, taskItemTemplate, renderCategories, taskForm, openNewCategory, openEditTask, openNewTask, closeModal, openModal, taskItemTemplate_complete } from "./renderTemplates.js";
import {
    PRIORITY_BADGE, STATUS_LABEL, STATUS_LABEL_Array, PRIORITY_LABEL, GetStatusLabel, $, $$, fmtDate, sameDay
    , todayISO, getTextColor, taskDone, hexToRgb, getLuminance
    , fetchState, getCachdData, saveStateIntoCache, fetchNewData, state
    , getDayName, getMonthYear, getDaysInMonth, getFirstDayOfMonth
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

    // Get the correct elements
    const categoryFilterList = document.getElementById('categoryFilterList');
    const categoryFilterEmpty = document.getElementById('categoryFilterEmpty');

    if (!categoryFilterList) {
        console.error('categoryFilterList element not found');
        return;
    }

    // Handle empty state
    if (!categories || categories.length === 0) {
        categoryFilterList.innerHTML = '';
        categoryFilterEmpty?.classList.remove('hidden');
        return;
    }

    try {
        // Render categories as filter items (not buttons)
        const categoryHTML = await Promise.all(
            categories.map(category => render_mono_category(category))
        );

        categoryFilterList.innerHTML = categoryHTML.join('');
        categoryFilterEmpty?.classList.add('hidden');

        // Attach event listeners for the checkboxes
        categoryFilterList.querySelectorAll('input[data-filter-category]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateCategorySelection();
                // Trigger your filter logic here
                applyFilters(); // or whatever your filter function is called
            });
        });

    } catch (error) {
        console.error('Error loading categories:', error);
        categoryFilterList.innerHTML = '<p class="text-xs text-red-400 px-3 py-2">Error loading categories</p>';
    }
}

function updateCategorySelection() {
    const categoryCheckboxes = document.querySelectorAll('[data-filter-category]');
    const checkedCategories = Array.from(categoryCheckboxes).filter(cb => cb.checked);
    const count = checkedCategories.length;

    const selectionText = document.getElementById('categorySelectionText');
    const selectionCount = document.getElementById('categorySelectionCount');
    const clearBtn = document.getElementById('clearCategoryFilters');

    if (!selectionText) return; // Guard clause

    if (count === 0) {
        selectionText.textContent = 'Select categories';
        selectionCount?.classList.add('hidden');
        clearBtn?.classList.add('opacity-0', 'pointer-events-none');
    } else if (count === 1) {
        const categoryName = checkedCategories[0].closest('label').querySelector('span:nth-child(3)').textContent.trim();
        selectionText.textContent = categoryName;
        selectionCount?.classList.add('hidden');
        clearBtn?.classList.remove('opacity-0', 'pointer-events-none');
    } else {
        selectionText.textContent = `${count} categories`;
        if (selectionCount) {
            selectionCount.textContent = count;
            selectionCount.classList.remove('hidden');
        }
        clearBtn?.classList.remove('opacity-0', 'pointer-events-none');
    }
}

function initCategoryDropdown() {
    const dropdownToggle = document.getElementById('categoryDropdownToggle');
    const dropdownMenu = document.getElementById('categoryDropdownMenu');
    const dropdownIcon = document.getElementById('categoryDropdownIcon');
    const clearBtn = document.getElementById('clearCategoryFilters');

    if (!dropdownToggle || !dropdownMenu) return;

    // Toggle dropdown
    dropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = dropdownMenu.classList.contains('hidden');
        dropdownMenu.classList.toggle('hidden');
        if (dropdownIcon) {
            dropdownIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.add('hidden');
            if (dropdownIcon) {
                dropdownIcon.style.transform = 'rotate(0deg)';
            }
        }
    });

    // Clear button
    clearBtn?.addEventListener('click', () => {
        document.querySelectorAll('[data-filter-category]').forEach(cb => cb.checked = false);
        updateCategorySelection();
        applyFilters(); // Trigger your filter logic
    });
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
    initCategoryDropdown();
    await fillPanelsOption();
    wireTasksPanel();
    await listAllTasks();
}

/**
 * Initializes the calendar panel
 */

// Navigation Controls
const calTodayBtn = document.getElementById('calTodayBtn');
const calPrevBtn = document.getElementById('calPrevBtn');
const calNextBtn = document.getElementById('calNextBtn');
const calViewMode = document.getElementById('calViewMode');

// Display Elements
const calCurrentMonth = document.getElementById('calCurrentMonth');
const selectedDayName = document.getElementById('selectedDayName');
const selectedDayNumber = document.getElementById('selectedDayNumber');
const selectedMonthYear = document.getElementById('selectedMonthYear');
const selectedDayTaskCount = document.getElementById('selectedDayTaskCount');
const monthTotalTasks = document.getElementById('monthTotalTasks');
const monthCompletedTasks = document.getElementById('monthCompletedTasks');
const monthOverdueTasks = document.getElementById('monthOverdueTasks');

// Dynamic Content Areas
const calendarMainGrid = document.getElementById('calendarMainGrid');
const weekViewContainer = document.getElementById('weekViewContainer');
const selectedDayTasks = document.getElementById('selectedDayTasks');

async function calendarViewPanel() {
    const today = new Date();

    await renderMonthCalendar(today.getFullYear(), today.getMonth());
    await renderWeekCalendar(today);

    calendarEventWiring();
}

// Helper function to get task count for a specific date
async function getTaskCountForDate(year, month, day) {
    // This should filter your tasks array by date
    const data = await state();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return data.tasks.filter(task => task.dueDate === dateStr).length;
}

// Render full month calendar
async function renderMonthCalendar(year, month) {
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    const daysInPrevMonth = month === 0 ? getDaysInMonth(year - 1, 11) : getDaysInMonth(year, month - 1);

    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    const todayDate = today.getDate();

    let html = '';

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const taskCount = await getTaskCountForDate(prevYear, prevMonth, day);

        html += render_mono_calander_day(day, prevMonth, prevYear, false, false, false, taskCount);
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = isCurrentMonth && day === todayDate;
        const taskCount = await getTaskCountForDate(year, month, day);

        html += render_mono_calander_day(day, month, year, true, isToday, false, taskCount);
    }

    // Next month's leading days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

    for (let day = 1; day <= remainingCells; day++) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const taskCount = await getTaskCountForDate(nextYear, nextMonth, day);

        html += render_mono_calander_day(day, nextMonth, nextYear, false, false, false, taskCount);
    }

    calendarMainGrid.innerHTML = html;

    // Add click event listeners to all day cells
    document.querySelectorAll('.cal-day').forEach(dayCell => {
        dayCell.addEventListener('click', function () {
            const dateStr = this.getAttribute('data-date');
            const date = new Date(dateStr + 'T00:00:00');
            selectDay(date);
        });
    });
}

// Render week calendar
async function renderWeekCalendar(date) {
    // Calculate week start (Sunday)
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());

    const today = new Date();
    const days = [];

    // Generate 7 day columns
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(weekStart);
        currentDay.setDate(weekStart.getDate() + i);

        const isToday = currentDay.toDateString() === today.toDateString();
        const tasksForDay = await getTasksForDate(currentDay);

        days.push({
            date: currentDay,
            day: currentDay.getDate(),
            dayName: getDayName(currentDay).substring(0, 3), // Mon, Tue, etc.
            isToday: isToday,
            tasks: tasksForDay
        });
    }

    // Generate HTML for week view
    let html = `
    <div class="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800">
      ${days.map(dayData => `
        <div class="bg-white dark:bg-gray-900 min-h-[600px] flex flex-col">
          <!-- Day Header -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-800 ${dayData.isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
        }">
            <div class="text-center">
              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                ${dayData.dayName}
              </p>
              <p class="text-2xl font-bold ${dayData.isToday
            ? 'w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto'
            : 'text-gray-900 dark:text-white'
        }">
                ${dayData.day}
              </p>
              ${dayData.tasks.length > 0 ? `
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ${dayData.tasks.length} task${dayData.tasks.length !== 1 ? 's' : ''}
                </p>
              ` : ''}
            </div>
          </div>
          
          <!-- Tasks for the day -->
          <div class="flex-1 overflow-y-auto p-3 space-y-2">
            ${dayData.tasks.length > 0 ? `
              ${dayData.tasks.map(task => `
                <div class="week-task-card p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${task.status === 'Done'
                ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                : task.status === 'inProgress'
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'
                    : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
            }" data-task-id="${task.id}">
                  <!-- Priority Indicator -->
                  <div class="flex items-start gap-2 mb-2">
                    <div class="w-1 h-full rounded-full ${task.priority === 'high'
                ? 'bg-red-500'
                : task.priority === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
            }"></div>
                    <div class="flex-1 min-w-0">
                      <h4 class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        ${task.title}
                      </h4>
                      ${task.description ? `
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          ${task.description}
                        </p>
                      ` : ''}
                    </div>
                  </div>
                  
                  <!-- Task Footer -->
                  <div class="flex items-center justify-between mt-2">
                    ${task.category ? `
                      <span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        ${task.category}
                      </span>
                    ` : '<span></span>'}
                    
                    <div class="flex items-center gap-1">
                      ${task.status === 'Done' ? `
                        <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                        </svg>
                      ` : task.status === 'inProgress' ? `
                        <svg class="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                        </svg>
                      ` : ''}
                    </div>
                  </div>
                </div>
              `).join('')}
            ` : `
              <div class="text-center py-8">
                <svg class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p class="text-xs text-gray-400 dark:text-gray-600">No tasks</p>
              </div>
            `}
          </div>
        </div>
      `).join('')}
    </div>
  `;

    // Populate week view container
    weekViewContainer.innerHTML = html;

    // Add click event listeners to task cards
    document.querySelectorAll('.week-task-card').forEach(card => {
        card.addEventListener('click', function () {
            const taskId = this.getAttribute('data-task-id');
            // Open task details modal or perform action
            openTaskDetails(taskId);
        });
    });
}

// Helper function to get tasks for a specific date
async function getTasksForDate(date) {
    const data = await state();
    return data.tasks.filter(t => sameDay(new Date(t.reminder.split('T')[0]), date));
}

// Event wiring for calendar controls
function calendarEventWiring() {
    document.getElementById('calTodayBtn').addEventListener('click', () => {
        // Set calendar to current date
        cal = new Date();
        renderMonthCalendar(cal.getFullYear(), cal.getMonth());
        renderWeekCalendar(cal);
        updateMonthStats(cal.getFullYear(), cal.getMonth());
    });

    // Previous/Next buttons
    document.getElementById('calPrevBtn').addEventListener('click', () => {
        // Decrement month
        cal.setMonth(cal.getMonth() - 1);
        renderMonthCalendar(cal.getFullYear(), cal.getMonth());
        renderWeekCalendar(cal);
        updateMonthStats(cal.getFullYear(), cal.getMonth());
    });

    document.getElementById('calNextBtn').addEventListener('click', () => {
        // Increment month
        cal.setMonth(cal.getMonth() + 1);
        renderMonthCalendar(cal.getFullYear(), cal.getMonth());
        renderWeekCalendar(cal);
        updateMonthStats(cal.getFullYear(), cal.getMonth());
    });

    document.getElementById('calViewMode').addEventListener('change', (e) => {
        const mode = e.target.value; // 'month' or 'week'

        if (mode === 'week') {
            // Hide #calendarMainGrid
            calendarMainGrid.classList.add('hidden');
            // Show #weekViewContainer
            weekViewContainer.classList.remove('hidden');
        } else {
            // Show #calendarMainGrid
            calendarMainGrid.classList.remove('hidden');
            // Hide #weekViewContainer
            weekViewContainer.classList.add('hidden');
        }
    });
}

// Function to select a day and update the sidebar
function selectDay(date) {
    // Update selected date card
    document.getElementById('selectedDayName').textContent = getDayName(date);
    document.getElementById('selectedDayNumber').textContent = date.getDate();
    document.getElementById('selectedMonthYear').textContent = getMonthYear(date);

    // Filter and display tasks for selected date
    const tasksForDay = tasks.filter(task => isSameDay(task.dueDate, date));
    renderDayTasks(tasksForDay);

    // Update task count
    document.getElementById('selectedDayTaskCount').textContent = tasksForDay.length;
}

// Function to render tasks for the selected day
function renderDayTasks(tasks) {
    const container = document.getElementById('selectedDayTasks');

    if (tasks.length === 0) {
        // Show empty state
        container.innerHTML = `
      <div class="text-center py-8 text-gray-400">
        <svg class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p class="text-xs text-gray-400 dark:text-gray-600">No tasks</p>
      </div>
    `;
    } else {
        // Render task cards
        container.innerHTML = tasks.map(task => createTaskCard(task)).join('');
    }
}

// Function to create a task card
function createTaskCard(task) {
    // Return HTML for individual task
    // Should include:
    // - Task title
    // - Status indicator
    // - Priority badge
    // - Category tag
    // - Click handler to open task details
    return `
        <div class="task-card p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${task.status === 'Done'
        ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
        : task.status === 'inProgress'
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'
            : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
    }" data-task-id="${task.id}">
            <!-- Priority Indicator -->
            <div class="flex items-start gap-2 mb-2">
                <div class="w-1 h-full rounded-full ${task.priority === 'high'
        ? 'bg-red-500'
        : task.priority === 'medium'
            ? 'bg-yellow-500'
            : 'bg-green-500'
    }"></div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        ${task.title}
                    </h4>
                    ${task.description ? `
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            ${task.description}
                        </p>
                    ` : ''}
                </div>
            </div>
            
            <!-- Task Footer -->
            <div class="flex items-center justify-between mt-2">
                ${task.category ? `
                    <span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        ${task.category}
                    </span>
                ` : '<span></span>'}
                
                <div class="flex items-center gap-1">
                    ${task.status === 'Done' ? `
                        <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                        </svg>
                    ` : task.status === 'inProgress' ? `
                        <svg class="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                        </svg>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Function to update monthly statistics
function updateMonthStats(year, month) {
    const monthTasks = tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.getMonth() === month &&
            taskDate.getFullYear() === year;
    });

    const total = monthTasks.length;
    const completed = monthTasks.filter(t => t.status === 'Done').length;
    const overdue = monthTasks.filter(t => isOverdue(t)).length;

    document.getElementById('monthTotalTasks').textContent = total;
    document.getElementById('monthCompletedTasks').textContent = completed;
    document.getElementById('monthOverdueTasks').textContent = overdue;
}

// Helper functions for date utilities
function isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
}

function isToday(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isSameDay(date, today);
}

function isOverdue(task) {
    const taskDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return taskDate < today && task.status !== 'Done';
}

function getDayName(date) {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
}

function getMonthYear(date) {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

// Function to initialize the calendar view
async function initializeCalendar() {
    const today = new Date();
    cal = today;
    await renderMonthCalendar(today.getFullYear(), today.getMonth());
    await renderWeekCalendar(today);
    updateMonthStats(today.getFullYear(), today.getMonth());
}

// Function to open task details modal
function openTaskDetails(taskId) {
    // Implement your logic to open task details modal here
    console.log('Opening task details for task ID:', taskId);
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

    // Initialize calendar view
    initializeCalendar();
});