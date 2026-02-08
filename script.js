import { getTasks, createTask, updateTask, deleteTask, getCategories, createCategories, updateCategories } from "./utills.js";
import { settingsSectionTemplate, settingsSelectTemplate, settingsToggleTemplate, render_mono_category, render_mono_calander_day, taskItemTemplate, renderCategories, taskForm, openNewCategory, closeModal, openModal, taskItemTemplate_complete, deleteConfirmMenu } from "./renderTemplates.js";
import {
    PRIORITY_BADGE, STATUS_LABEL, STATUS_LABEL_Array, PRIORITY_LABEL, GetStatusLabel, $, $$, fmtDate, sameDay
    , taskDone, saveStateIntoCache, fetchNewData, state,
    toast,
    NULL_CATEGORY_TITLE,
    saveSettings,
    value_label_pair
} from "./sharedData.js";
import { logged_in, logout_user, navigate_login } from "./user.js";
import { initCategoriesPage, onCategoriesRouteActive, updateAllCategoryDropdowns, updateCategoryStats } from "./categoryManager.js";
import { loadSettings } from "./sharedData.js";
import { createFilterPlaceholder, createSidebarPlaceholder, createStatPlaceholder, createTaskPlaceholder } from "./ContentPlaceHolder.js";
export { re_RenderAll, fetchUpdate, renderAll, updateCategoryLocaly, deleteCategoryLocaly, createCategoryLocaly }

// Tailwind config
if (tailwind != undefined) {
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
}

/********************
 * Drag & Drop State
 ********************/
let draggedTask = null;

/********************
 * Calendar State
 ********************/
let cal = new Date();
let weekStartDate = new Date();
let currentViewMode = 'month';

/********************
 * Rendering Logic *
 ********************/
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

async function re_RenderAll() {
    await routeTo(currentRoutePage());
    // await renderAll()
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


let currentStatusFilterBtn = $(`#filterAll`);
const borderGlowClass = 'border-yellow-300'
const borderGlowClass_dark = 'dark:border-yellow-600'
currentStatusFilterBtn.classList.add(borderGlowClass)
currentStatusFilterBtn.classList.add(borderGlowClass_dark);
/**
 * @param filter Tasks status label (toDo, inProgress, .etc)
 */
async function renderTasks(filter = null) {
    const ul = $('#taskList');
    const data = await state();
    let items = [...data.tasks];

    const q = $('#searchInput')?.value?.trim().toLowerCase();
    if (q)
        items = items.filter(t => [t.title, t.description, t.tags?.join(' ')].join(' ').toLowerCase().includes(q));


    if (currentStatusFilterBtn) {
        currentStatusFilterBtn.classList.remove(borderGlowClass);
        currentStatusFilterBtn.classList.remove(borderGlowClass_dark);
    }
    currentStatusFilterBtn = $(`#filterAll`);
    if (filter && filter !== 'all') {
        items = items.filter(t => STATUS_LABEL[t.status] == filter);
        currentStatusFilterBtn = $(`[data-filter="${filter}"]`);
    }
    currentStatusFilterBtn.classList.add(borderGlowClass)
    currentStatusFilterBtn.classList.add(borderGlowClass_dark);


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
 * Calendar Functions
 ********************/
function changeMonth(index) {
    cal.setMonth(cal.getMonth() + index);
}

function changeWeek(direction) {
    weekStartDate.setDate(weekStartDate.getDate() + (direction * 7));
}

function getWeekOfMonth(date) {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const offsetDate = date.getDate() + firstDayOfWeek - 1;
    return Math.ceil(offsetDate / 7);
}

function getTotalWeeksInMonth(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const totalDaysOffset = totalDays + firstDayOfWeek - 1;
    return Math.ceil(totalDaysOffset / 7);
}

function updateWeekIndicator() {
    const weekNumber = getWeekOfMonth(weekStartDate);
    const totalWeeks = getTotalWeeksInMonth(weekStartDate.getFullYear(), weekStartDate.getMonth());
    const indicator = document.getElementById('weekIndicator');
    if (indicator) {
        indicator.textContent = `Week ${weekNumber}/${totalWeeks}`;
    }
}

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

        // double-click to create task
        cell.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            console.log('date sat at:', dayDate);
            
            openNewTaskForDate(dayDate);
        });

        // Add single click to select
        cell.addEventListener('click', () => selectDay(dayDate));

        // Add drag and drop for rescheduling
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            cell.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
        });

        cell.addEventListener('dragleave', () => {
            cell.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
        });

        cell.addEventListener('drop', async (e) => {
            e.preventDefault();
            cell.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');

            if (draggedTask) {
                const newDate = new Date(year, month, d);
                draggedTask.reminder = newDate.toISOString();
                await fetchUpdate(draggedTask, draggedTask.id, updateTask, updateTaskLocaly, FetchModes.UPDATE)
                toast(`Task moved to ${fmtDate(newDate)}`);
                draggedTask = null;
            }
        });

        grid.appendChild(cell);
    }
    saveStateIntoCache(data, Date.now());
}

// Render full month calendar
async function renderMonthCalendar(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    const todayDate = today.getDate();

    let html = '';

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const prevMonth = month - 1;
        const prevYear = prevMonth < 0 ? year - 1 : year;
        const actualPrevMonth = prevMonth < 0 ? 11 : prevMonth;
        const taskCount = await getTaskCountForDate(prevYear, actualPrevMonth, day);

        html += render_mono_calander_day(day, actualPrevMonth, prevYear, false, false, false, taskCount);
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
        const nextMonth = month + 1;
        const nextYear = nextMonth > 11 ? year + 1 : year;
        const actualNextMonth = nextMonth > 11 ? 0 : nextMonth;
        const taskCount = await getTaskCountForDate(nextYear, actualNextMonth, day);

        html += render_mono_calander_day(day, actualNextMonth, nextYear, false, false, false, taskCount);
    }

    calendarMainGrid.innerHTML = html;
    calCurrentMonth.textContent = new Date(year, month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    // Add event listeners
    document.querySelectorAll('.cal-day').forEach(dayCell => {
        // Double-click to add task
        dayCell.addEventListener('dblclick', async function (e) {
            e.stopPropagation();
            const dateStr = this.getAttribute('data-date');
            if (dateStr) {
                const date = new Date(dateStr + 'T00:00:00');
                openNewTaskForDate(date);
            }
        });

        // Single click to select
        dayCell.addEventListener('click', async function () {
            const dateStr = this.getAttribute('data-date');
            if (dateStr) {
                const date = new Date(dateStr + 'T00:00:00');
                await selectDay(date);
            }
        });

        // Drag and drop
        dayCell.addEventListener('dragover', (e) => {
            e.preventDefault();
            dayCell.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
        });

        dayCell.addEventListener('dragleave', () => {
            dayCell.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
        });

        dayCell.addEventListener('drop', async (e) => {
            e.preventDefault();
            dayCell.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');

            if (draggedTask) {
                const dateStr = dayCell.getAttribute('data-date');
                const newDate = new Date(dateStr + 'T00:00:00');
                draggedTask.reminder = newDate.toISOString();
                // await updateTask(draggedTask, draggedTask.id);
                // await re_RenderAll();
                await fetchUpdate(draggedTask, draggedTask.id, updateTask, updateTaskLocaly, FetchModes.UPDATE)
                toast(`Task moved to ${fmtDate(newDate)}`);
                draggedTask = null;
            }
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
            dayName: getDayName(currentDay).substring(0, 3),
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
          <div class="p-4 border-b border-gray-200 dark:border-gray-800 ${dayData.isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}">
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
              ${dayData.tasks.map(task => createWeekTaskCard(task)).join('')}
            ` : `
              <div class="text-center py-8">
                <svg class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p class="text-xs text-gray-400 dark:text-gray-600">No tasks</p>
                <button class="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold" 
                        onclick="openNewTaskForDate(new Date('${dayData.date.toISOString()}'))">
                    + Add Task
                </button>
              </div>
            `}
          </div>
        </div>
      `).join('')}
    </div>
  `;

    weekViewContainer.innerHTML = html;

    // Add click event listeners to task cards
    document.querySelectorAll('.week-task-card').forEach(async (card) => {
        // Click to edit
        card.addEventListener('click', function () {
            const taskId = this.getAttribute('data-task-id');
            if (taskId) {
                openEditTask(taskId);
            }
        });

        // Right-click context menu
        card.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            const taskId = this.getAttribute('data-task-id');
            showTaskContextMenu(e, taskId);
        });

        // Drag start
        card.setAttribute('draggable', true);
        card.addEventListener('dragstart', async (e) => {
            const taskId = card.getAttribute('data-task-id');
            const data = await state();
            draggedTask = data.tasks.find(t => t.id == taskId);
            card.classList.add('opacity-50', 'scale-95');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('opacity-50', 'scale-95');
        });
    });
}

// Helper function to create week task card
function createWeekTaskCard(task) {
    const priorityColors = {
        high: 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800',
        medium: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800',
        low: 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
    };

    const statusIcons = {
        Done: '<svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.415-1.415L11 9.586V6z" clip-rule="evenodd" /></svg>',
        inProgress: '<svg class="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" /></svg>',
        toDo: '<svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" /></svg>'
    };

    const priorityIndicator = {
        high: 'bg-red-500',
        medium: 'bg-yellow-500',
        low: 'bg-green-500'
    };

    return `
        <div class="week-task-card p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${priorityColors[task.proirity]}" 
             data-task-id="${task.id}"
             draggable="true">
            <div class="flex items-start gap-2 mb-2">
                <div class="w-1 h-full rounded-full ${priorityIndicator[task.proirity]}"></div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white truncate">${task.title}</h4>
                    ${task.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">${task.description}</p>` : ''}
                </div>
            </div>
            <div class="flex items-center justify-between mt-2">
                ${task.category ? `<span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${task.category}</span>` : '<span></span>'}
                <div class="flex items-center gap-1">
                    ${statusIcons[task.status] || ''}
                </div>
            </div>
        </div>
    `;
}

// Helper function to get tasks for a specific date
async function getTasksForDate(date) {
    const data = await state();
    return data.tasks.filter(t => {
        const taskDate = new Date(t.reminder);
        return taskDate.toDateString() === date.toDateString();
    });
}

// Event wiring for calendar controls
async function calendarEventWiring() {
    calTodayBtn.addEventListener('click', async () => {
        cal = new Date();
        weekStartDate = new Date();
        weekStartDate.setDate(cal.getDate() - cal.getDay());

        if (calViewMode.value === 'week') {
            await renderWeekCalendar(weekStartDate);
            updateWeekIndicator();
        } else {
            await renderMonthCalendar(cal.getFullYear(), cal.getMonth());
        }
        await updateMonthStats(cal.getFullYear(), cal.getMonth());
        await selectDay(cal);
    });

    // Previous/Next buttons - handle both month and week modes
    calPrevBtn.addEventListener('click', async () => {
        if (calViewMode.value === 'week') {
            changeWeek(-1);
            await renderWeekCalendar(weekStartDate);
            updateWeekIndicator();
        } else {
            cal.setMonth(cal.getMonth() - 1);
            await renderMonthCalendar(cal.getFullYear(), cal.getMonth());
        }
        await updateMonthStats(cal.getFullYear(), cal.getMonth());
    });

    calNextBtn.addEventListener('click', async () => {
        if (calViewMode.value === 'week') {
            changeWeek(1);
            await renderWeekCalendar(weekStartDate);
            updateWeekIndicator();
        } else {
            cal.setMonth(cal.getMonth() + 1);
            await renderMonthCalendar(cal.getFullYear(), cal.getMonth());
        }
        await updateMonthStats(cal.getFullYear(), cal.getMonth());
    });

    calViewMode.addEventListener('change', (e) => {
        const mode = e.target.value;
        currentViewMode = mode;

        if (mode === 'week') {
            calendarMainGrid.classList.add('hidden');
            weekViewContainer.classList.remove('hidden');
            weekStartDate = new Date(cal);
            weekStartDate.setDate(cal.getDate() - cal.getDay());
            renderWeekCalendar(weekStartDate);
            updateWeekIndicator();
        } else {
            calendarMainGrid.classList.remove('hidden');
            weekViewContainer.classList.add('hidden');
        }
    });
}

// Function to select a day and update the sidebar
async function selectDay(date) {
    const data = await state();

    // Update selected date card
    selectedDayName.textContent = getDayName(date);
    selectedDayNumber.textContent = date.getDate();
    selectedMonthYear.textContent = getMonthYear(date);

    // Filter and display tasks for selected date
    const tasksForDay = data.tasks.filter(task => {
        const taskDate = new Date(task.reminder);
        return taskDate.toDateString() === date.toDateString();
    });

    renderDayTasks(tasksForDay);

    // Update task count
    selectedDayTaskCount.textContent = tasksForDay.length;
}

// Function to render tasks for the selected day
function renderDayTasks(tasks) {
    if (tasks.length === 0) {
        selectedDayTasks.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-sm font-medium">No tasks for this day</p>
                <button class="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold" 
                        onclick="openNewTaskForDate()">
                    + Add Task
                </button>
            </div>
        `;
    } else {
        selectedDayTasks.innerHTML = tasks.map(task => createTaskCard(task)).join('');
    }
}

// Function to create a task card
function createTaskCard(task) {
    const priorityColors = {
        high: 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800',
        medium: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800',
        low: 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
    };

    const statusIcons = {
        Done: '<svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.415-1.415L11 9.586V6z" clip-rule="evenodd" /></svg>',
        inProgress: '<svg class="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" /></svg>',
        toDo: '<svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" /></svg>'
    };

    const priorityIndicator = {
        high: 'bg-red-500',
        medium: 'bg-yellow-500',
        low: 'bg-green-500'
    };

    return `
        <div class="task-card p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${priorityColors[task.proirity]}" 
             data-task-id="${task.id}"
             draggable="true">
            <div class="flex items-start gap-2 mb-2">
                <div class="w-1 h-full rounded-full ${priorityIndicator[task.proirity]}"></div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white truncate">${task.title}</h4>
                    ${task.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">${task.description}</p>` : ''}
                </div>
            </div>
            <div class="flex items-center justify-between mt-2">
                ${task.category ? `<span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${task.category}</span>` : '<span></span>'}
                <div class="flex items-center gap-1">
                    ${statusIcons[task.status] || ''}
                </div>
            </div>
        </div>
    `;
}

// Function to update monthly statistics
async function updateMonthStats(year, month) {
    const data = await state();
    const monthTasks = data.tasks.filter(task => {
        const taskDate = new Date(task.reminder);
        return taskDate.getMonth() === month &&
            taskDate.getFullYear() === year;
    });

    const total = monthTasks.length;
    const completed = monthTasks.filter(t => t.status === 'Done').length;
    const overdue = monthTasks.filter(t => isOverdue(t)).length;

    monthTotalTasks.textContent = total;
    monthCompletedTasks.textContent = completed;
    monthOverdueTasks.textContent = overdue;
}

// Helper functions for date utilities
function isSameDay(date1, date2) {
    return sameDay(date1, date2);
}

function isToday(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isSameDay(date, today);
}

function isOverdue(task) {
    const taskDate = new Date(task.reminder);
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
    weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() - today.getDay());

    await renderMonthCalendar(today.getFullYear(), today.getMonth());
    await renderWeekCalendar(weekStartDate);
    await updateMonthStats(today.getFullYear(), today.getMonth());
    await selectDay(today);

    if (calViewMode.value === 'week') {
        updateWeekIndicator();
    }
}

// Function to open new task modal with pre-filled date
async function openNewTaskForDate(date = new Date()) {
    const data = await state();

    openModal({
        title: `New Task - ${fmtDate(date.toISOString())}`,
        bodyHTML: taskForm({
            status: currentSettings.defaultTaskStatus,
            proirity: currentSettings.defaultTaskPriority,
            category: data.categories[0]?.id || '',
            reminder: date.toISOString()
        }),
        async onSubmit() {
            const t = {
                title: $('#f-title').value.trim(),
                description: $('#f-desc').value.trim(),
                category: $('#f-category').value,
                reminder: $('#f-due').value ? new Date($('#f-due').value).toISOString() : date.toISOString(),
                status: $('#f-status').value.trim(),
                proirity: $('#f-priority').value
            };
            if (!t.title) {
                toast('Title is required', 'error');
                return false;
            }
            try {
                await fetchUpdate(t, null, createTask, createTaskLocaly, FetchModes.CREATE);
                toast('Task created successfully');
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
        async onSubmit() {
            t.title = $('#f-title').value.trim();
            t.description = $('#f-desc').value.trim();
            t.category = $('#f-category').value;
            if ($('#f-due').value !== "")
                t.reminder = new Date($('#f-due').value).toISOString();
            t.status = $('#f-status').value.trim();
            t.proirity = $('#f-priority').value;

            await fetchUpdate(t, id, updateTask, updateTaskLocaly, FetchModes.UPDATE)

            toast('Task updated successfully');
        }
    });
}

//#region Datas Local Changes
// The first argument is ID and secound is the updated field

async function createCategoryLocaly(category) {
    const currentState = await state();
    const categories = [...currentState.categories]; // clone

    categories.push({ ...category });

    const updatedData = { ...currentState, categories };
    saveStateIntoCache(updatedData, Date.now());
}

async function updateCategoryLocaly(id, category) {
    const currentState = await state();
    const categories = [...currentState.categories];

    const index = categories.findIndex(c => c.id == id);
    if (index === -1) return;

    const updatedCategory = { ...categories[index], ...category };
    categories[index] = updatedCategory;

    const updatedData = { ...currentState, categories };
    saveStateIntoCache(updatedData, Date.now());
}

async function deleteCategoryLocaly(id) {
    const currentState = await state();
    const categories = currentState.categories.filter(c => c.id != id);

    // If no change, skip save
    if (categories.length === currentState.categories.length) return;

    const updatedData = { ...currentState, categories };
    saveStateIntoCache(updatedData, Date.now());
}

async function createTaskLocaly(task) {
    const currentState = await state();
    const tasks = [...currentState.tasks];

    tasks.push({ ...task });

    const updatedData = { ...currentState, tasks };
    saveStateIntoCache(updatedData, Date.now());
}

async function deleteTaskLocaly(id) {
    const currentState = await state();
    const tasks = currentState.tasks.filter(t => t.id != id);

    if (tasks.length === currentState.tasks.length) return; // nothing removed

    const updatedData = { ...currentState, tasks };
    saveStateIntoCache(updatedData, Date.now());
}

async function updateTaskLocaly(id, updatedFields) {
    const currentState = await state();
    // clone array to avoid reference issues
    const tasks = [...currentState.tasks];
    const index = tasks.findIndex(t => t.id == id);
    if (index === -1)
        return;
    const updatedTask = { ...tasks[index], ...updatedFields };
    tasks[index] = updatedTask;
    const updatedData = { ...currentState, tasks };

    saveStateIntoCache(updatedData, Date.now());
}


//#endregion


export const FetchModes = {
    CREATE: 'create',
    DELETE: 'delete',
    UPDATE: 'update',
};

/**
 * @param object The object(task, category) we want to do something on it
 * @param id First parameter's ID
 * @param {Function} serverFunction Function that commucates to API, must return HttpResponse
 * @param {Function} clientFunction Function that applies the changes locally to cached Memmory
 * @param {int} mode The change's type we're going to apply, based on 'FetchModes'
 */
async function fetchUpdate(object = null, id = -1, serverFunction, clientFunction, mode = FetchModes.UPDATE) {
    let response;
    try {

        switch (mode) {
            case FetchModes.CREATE:
                response = await serverFunction(object);
                break;
            case FetchModes.DELETE:
                response = await serverFunction(id);
                break;
            case FetchModes.UPDATE:
                response = await serverFunction(id, object);
                break;
        }

        if (!response.ok) {
            if (response.status == 404) {
                await fetchNewData();
                re_RenderAll();
                return;
            }
            throw new Error(`Error HTTP Code ${response.status}`);
        }
    } catch (error) {
        console.log('Some Shit Happened: ', error);
    }

    let retunredObject = null;
    // Some response don't return an json object(like Delete_204)
    try {
        retunredObject = await response.json();
    } catch (err) { /* Do Nothing */ }

    switch (mode) {
        case FetchModes.CREATE:
            await clientFunction(retunredObject);
            break;
        case FetchModes.DELETE:
            await clientFunction(id);
            break;
        case FetchModes.UPDATE:
            await clientFunction(id, retunredObject);
            break;
    }

    await re_RenderAll();
}


// Function to show task context menu
function showTaskContextMenu(e, taskId) {
    e.preventDefault();

    // Remove existing context menu
    const existingMenu = document.getElementById('taskContextMenu');
    if (existingMenu) {
        existingMenu.remove();
    }

    // Create context menu
    const menu = document.createElement('div');
    menu.id = 'taskContextMenu';
    menu.className = 'fixed z-50 w-48 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl p-2';
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';

    menu.innerHTML = `
        <button class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium flex items-center gap-2" onclick="openEditTask(${taskId})">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Edit Task
        </button>
        <button class="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2" onclick="confirmDeleteTask(${taskId})">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Delete Task
        </button>
    `;

    document.body.appendChild(menu);

    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }, 100);
}

// Function to confirm delete task
async function confirmDeleteTask(taskId) {
    const data = await state();
    const task = data.tasks.find(t => t.id == taskId);

    if (!task) return;

    openModal({
        title: 'Delete Task',
        bodyHTML: deleteConfirmMenu(true, task.title),
        async onSubmit() {
            data.tasks = data.tasks.filter(t => t.id != taskId);
            await fetchUpdate(task, taskId, deleteTask, deleteTaskLocaly, FetchModes.DELETE);
            toast('Task deleted successfully');
            return true;
        }
    });
}

// Make functions global for onclick handlers
window.openNewTaskForDate = openNewTaskForDate;
window.confirmDeleteTask = confirmDeleteTask;

/********************
 * Drag & Drop (Kanban)
 ********************/
export async function renderKanbanFull() {
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
    await enableDnD();
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
        const dargInEvent = (dropZone) => dropZone.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
        const dargOutEvent = (dropZone) => dropZone.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');

        // When we move into a card into a zone
        drop.addEventListener('dragover', e => {
            e.preventDefault();
            dargInEvent(drop);
        });
        // When we move a card out from a zone
        drop.addEventListener('dragleave', e => {
            dargOutEvent(drop);
        });


        drop.addEventListener('drop', async e => {
            e.stopImmediatePropagation();
            e.preventDefault();
            dargOutEvent(drop);

            const id = Number(e.dataTransfer.getData('text/plain'));
            const col = drop.closest('.kanban-col');
            const st = GetStatusLabel(col.dataset.status);
            const t = data.tasks.find(x => x.id === id);

            if (t) {
                t.status = st.trim();
                await fetchUpdate(t, id, updateTask, updateTaskLocaly, FetchModes.UPDATE);

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
        confirmDeleteTask(taskId);
    },

    async handleMove(taskId) {
        const data = await state();
        const task = data.tasks.find(t => t.id == taskId);

        if (!task) return;

        task.status = nextStatus(task.status);

        // await updateTask(task, taskId);
        // await re_RenderAll();
        await fetchUpdate(task, taskId, updateTask, updateTaskLocaly, FetchModes.UPDATE);

        toast(`Moved to ${STATUS_LABEL[task.status]}`);
    },

    async handleToggleComplete(taskId, isChecked) {
        const data = await state();
        const task = data.tasks.find(t => t.id == taskId);

        if (!task) return;

        task.status = GetStatusLabel(isChecked ? 'Done' : 'inProgress');

        // await updateTask(task, taskId);
        // await re_RenderAll();
        await fetchUpdate(task, taskId, updateTask, updateTaskLocaly, FetchModes.UPDATE);
    },

    async handleTitleEdit(taskId, newTitle) {
        const data = await state();
        const task = data.tasks.find(t => t.id == taskId);

        if (!task) return;

        task.title = newTitle;

        // await updateTask(task, taskId);
        // await re_RenderAll();
        await fetchUpdate(task, taskId, updateTask, updateTaskLocaly, FetchModes.UPDATE);
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
    // hasWiredTaskPanel = true;
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
                listAllTasks();
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
        applyFilters();
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
 * Initalize the category panel
 */



/**
 * Initializes the tasks panel
 */
// let hasWiredTaskPanel = false;
export async function renderTasksPanel() {
    initCategoryDropdown();
    await fillPanelsOption();
    // if (!hasWiredTaskPanel)
        
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
const weekIndicator = document.getElementById('weekIndicator');


function wireCalendarPanel() {
    $('#prevMonth').addEventListener('click', () => {
        changeMonth(-1);
        renderCalendar();
    });
    $('#nextMonth').addEventListener('click', () => {
        changeMonth(1);
        renderCalendar();
    });
}

async function calendarViewPanel() {
    const today = new Date();

    await renderMonthCalendar(today.getFullYear(), today.getMonth());
    await renderWeekCalendar(today);
    await calendarEventWiring();
    await updateMonthStats(today.getFullYear(), today.getMonth());
}

// Helper function to get task count for a specific date
async function getTaskCountForDate(year, month, day) {
    const data = await state();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return data.tasks.filter(task => {
        const taskDate = new Date(task.reminder);

        return (taskDate.toISOString().startsWith(dateStr)) | false;
    }).length;
}


/********************
 * Routing
********************/

function currentRoutePage() {
    const activeRoute = [...document.querySelectorAll('[id^="route-"]')]
        .find(el => !el.classList.contains('hidden'));

    if (!activeRoute) return null;

    return activeRoute.id.replace('route-', '');
}


async function routeTo(name) {
    ['dashboard', 'kanban', 'tasks', 'calendar', 'categories', 'settings'].forEach(r => $('#route-' + r).classList.add('hidden'));
    $('#route-' + name).classList.remove('hidden');
    $$('.nav-link').forEach(a => {
        if (a.dataset.nav === name)
            a.classList.add('bg-gradient-to-r', 'from-blue-50', 'to-indigo-50', 'dark:from-gray-800', 'dark:to-gray-800/50');
        else
            a.classList.remove('bg-gradient-to-r', 'from-blue-50', 'to-indigo-50', 'dark:from-gray-800', 'dark:to-gray-800/50');
    });
    switch (name) {
        default:
        case 'route-dashboard':
        case 'dashboard':
            renderAll();
            break;
        case 'kanban':
            await renderKanbanFull();
            break;

        case 'tasks':
            renderTasksPanel();
            break;

        case 'calendar':
            calendarViewPanel();
            break;

        case 'categories':
            onCategoriesRouteActive()
            break;

        case 'settings':
            renderSettings();
            break;
    }
}

/********************
 * Event Wiring
 ********************/
async function wire() {
    $$('.nav-link').forEach(a => a.addEventListener('click', async e => {
        e.preventDefault();
        await routeTo(a.dataset.nav);
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
            await fetchUpdate(t, id, updateTask, updateTaskLocaly, FetchModes.UPDATE);
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
                confirmDeleteTask(id);
            }
            if (btn.dataset.action === 'move') {
                const t = data.tasks.find(x => {
                    console.log(x.id, id);
                    return x.id == id
                });
                t.status = nextStatus(t.status);
                await fetchUpdate(t, id, updateTask, updateTaskLocaly, FetchModes.UPDATE);
                toast('Moved to ' + STATUS_LABEL[t.status]);
            }
            if (btn.dataset.action === 'toggle-complete')
                await taskStatusUpdate(id, data, GetStatusLabel(btn.checked ? 'Done' : 'inProgress'))
        }
    });

    $('#newTaskBtn').addEventListener('click', function (e) {
        openNewTaskForDate();
    });
    $('#addTaskTop').addEventListener('click', function (e) {
        openNewTaskForDate();
    });
    $('#newCategoryBtn').addEventListener('click', openNewCategory);
    $('#addCategoryTop').addEventListener('click', openNewCategory);

    $('#saveNotes').addEventListener('click', () => { state.notes = $('#quickNotes').value; saveState(); toast('Notes saved successfully'); });
    $('#quickNotes').value = state.notes || '';

    $('#openSidebar').addEventListener('click', () => $('#sidebar').classList.remove('hidden'));
    $('#closeSidebar').addEventListener('click', () => $('#sidebar').classList.add('hidden'));

    $('#themeToggle').addEventListener('click', toggleTheme);

    $('#logoutBtn').addEventListener('click', logout);

    // Keyboard shortcuts
    document.addEventListener('keydown', async e => {
        if (e.key === '/' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            $('#searchInput')?.focus();
        }
        if (e.key.toLowerCase() === 'n' && !e.target.matches('input, textarea')) {
            openNewTaskForDate();
        }
        if (e.key.toLowerCase() === 'd' && !e.target.matches('input, textarea')) {
            toggleTheme();
        }
        if (e.key.toLowerCase() === 'c' && !e.target.matches('input, textarea')) {
            await routeTo('calendar');
        }
        if (e.key.toLowerCase() === 'k' && !e.target.matches('input, textarea')) {
            await routeTo('kanban');
        }
        if (e.key.toLowerCase() === 't' && !e.target.matches('input, textarea')) {
            await routeTo('tasks');
        }
        if (e.key === 'Escape') {
            closeModal();
        }
    });
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


async function taskStatusUpdate(id, data, status) {
    const t = data?.tasks?.find(x => x.id == id);

    // Data is corrupted or missing -> refetch
    if (!t || !('status' in t)) {
        data = await fetchNewData();
        t = data.tasks.find(x => x.id == id);

        if (!t) {
            console.error(`Task ${id} not found even after refresh`);
            return; // give up gracefully
        }
    }

    // Now safe to update
    t.status = status;
    await fetchUpdate(t, id, updateTask, updateTaskLocaly, FetchModes.UPDATE);
}


/********************
 * Settings Panel
 ********************/
let currentSettings = loadSettings();

async function renderSettings() {
    const container = $('#route-settings');
    if (!container) return;

    const settingsHTML = `
        <div class="max-w-5xl mx-auto space-y-6">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 class="text-3xl font-bold bg-gradient-to-r from-gray-600 to-gray-500 dark:from-gray-300 dark:to-gray-400 bg-clip-text text-transparent">
                        Settings
                    </h2>
                    <p class="text-gray-500 dark:text-gray-400 mt-1">Customize your TaskFlow experience</p>
                </div>
                <div class="flex items-center gap-2">
                    <button id="resetSettingsBtn" 
                            class="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors">
                        Reset to Default
                    </button>
                    <button id="exportSettingsBtn" 
                            class="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 font-medium transition-colors">
                        Export Settings
                    </button>
                </div>
            </div>

            <!-- Settings Sections -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <!-- Appearance Section -->
                ${settingsSectionTemplate('Appearance', `
                    ${settingsSelectTemplate('theme', 'Theme', [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'auto', label: 'Auto (System)' }
    ], currentSettings.theme)}
                    ${settingsSelectTemplate('dateFormat', 'Date Format', [
        { value: 'short', label: 'Short (Jan 1)' },
        { value: 'long', label: 'Long (January 1, 2024)' },
        { value: 'relative', label: 'Relative (Today, Tomorrow)' }
    ], currentSettings.dateFormat)}
                    ${settingsToggleTemplate('showCompletedTasks', 'Show Completed Tasks', 'Display completed tasks in lists', currentSettings.showCompletedTasks)}
                `)}

                <!-- Task Defaults Section -->
                ${settingsSectionTemplate('Task Defaults', `
                    ${settingsSelectTemplate('defaultTaskPriority', 'Default Priority',
        value_label_pair(PRIORITY_LABEL)
        , currentSettings.defaultTaskPriority)}
                    ${settingsSelectTemplate('defaultTaskStatus', 'Default Status',
            value_label_pair(STATUS_LABEL)
            , currentSettings.defaultTaskStatus)}
                    <div class="space-y-2">
                        <label for="defaultReminderTime" class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Default Reminder Time
                        </label>
                        <input type="time" id="defaultReminderTime" 
                               value="${currentSettings.defaultReminderTime}"
                               class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 
                                      bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 
                                      focus:border-transparent transition-all settings-input"
                               data-setting="defaultReminderTime">
                    </div>
                `)}

                <!-- Behavior Section -->
                ${settingsSectionTemplate('Behavior', `
                    ${settingsToggleTemplate('autoSaveNotes', 'Auto-save Notes', 'Automatically save notes as you type', currentSettings.autoSaveNotes)}
                    ${settingsToggleTemplate('enableKeyboardShortcuts', 'Keyboard Shortcuts', 'Enable keyboard navigation (/, N, D, etc.)', currentSettings.enableKeyboardShortcuts)}
                    ${settingsToggleTemplate('enableDragDrop', 'Drag & Drop', 'Enable drag and drop for tasks', currentSettings.enableDragDrop)}
                `)}

                <!-- Notifications Section -->
                ${settingsSectionTemplate('Notifications', `
                    ${settingsToggleTemplate('enableNotifications', 'Enable Notifications', 'Show browser notifications for due tasks', currentSettings.enableNotifications)}
                    <div class="space-y-2">
                        <label for="notifyBeforeDue" class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Notify Before Due
                        </label>
                        <select id="notifyBeforeDue" 
                                class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 
                                       bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 
                                       focus:border-transparent transition-all cursor-pointer settings-select"
                                data-setting="notifyBeforeDue">
                            <option value="1" ${currentSettings.notifyBeforeDue === 1 ? 'selected' : ''}>1 hour</option>
                            <option value="6" ${currentSettings.notifyBeforeDue === 6 ? 'selected' : ''}>6 hours</option>
                            <option value="24" ${currentSettings.notifyBeforeDue === 24 ? 'selected' : ''}>1 day</option>
                            <option value="48" ${currentSettings.notifyBeforeDue === 48 ? 'selected' : ''}>2 days</option>
                        </select>
                    </div>
                `)}

            </div>

            <!-- Save Button -->
            <div class="flex justify-end">
                <button id="saveAllSettingsBtn" 
                        class="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white 
                               hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 
                               hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 font-semibold">
                    Save All Settings
                </button>
            </div>
        </div>
    `;

    container.innerHTML = settingsHTML;
    wireSettingsEvents();
}

function wireSettingsEvents() {
    // Handle toggle changes
    $$('.settings-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const setting = e.target.dataset.setting;
            currentSettings[setting] = e.target.checked;
            applySettingImmediately(setting, e.target.checked);
        });
    });

    // Handle select changes
    $$('.settings-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const setting = e.target.dataset.setting;
            currentSettings[setting] = e.target.value;
        });
    });

    // Handle input changes
    $$('.settings-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const setting = e.target.dataset.setting;
            currentSettings[setting] = e.target.value;
        });
    });

    // Save all button
    $('#saveAllSettingsBtn')?.addEventListener('click', () => {
        saveSettings(currentSettings);
        applySettings(currentSettings);
    });

    // Reset button
    $('#resetSettingsBtn')?.addEventListener('click', () => {
        openModal({
            title: 'Reset Settings',
            bodyHTML: `
                <div class="text-center py-6">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                        <svg class="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                    <h4 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Reset All Settings?</h4>
                    <p class="text-gray-600 dark:text-gray-400 mb-4">This will restore all settings to their default values. This action cannot be undone.</p>
                </div>
            `,
            async onSubmit() {
                currentSettings = { ...DEFAULT_SETTINGS };
                saveSettings(currentSettings);
                await renderSettings();
                toast('Settings reset to defaults');
                return true;
            }
        });
    });

    // Export button
    $('#exportSettingsBtn')?.addEventListener('click', () => {
        const dataStr = JSON.stringify(currentSettings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `taskflow-settings-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast('Settings exported');
    });
}

function applySettingImmediately(key, value) {
    console.log('Some shit has changed');

    switch (key) {
        case 'theme':
            applyTheme(value);
            break;
        case 'showCompletedTasks':
            renderAll();
            break;
        case 'enableKeyboardShortcuts':
            // Handled in the event listener setup
            break;
        case 'enableDragDrop':
            // Will take effect on next render
            renderAll();
            break;
    }
}

function applySettings(settings) {
    // Apply theme
    if (settings.theme) applyTheme(settings.theme);

    // Re-render all views to apply changes
    renderAll();
}

function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === 'auto') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.classList.toggle('dark', isDark);
    } else {
        html.classList.toggle('dark', theme === 'dark');
    }
    localStorage.setItem('theme', theme);
}


//  This function must be completed ...
function loadContentPlaceHolders() {
    setTasksLoading("#taskList")
    setFilterLoading("#filterBar")
    setStatsLoading("#statsRow");
    setSidebarLoading("#sidebar")
}

function clearContentPlaceHolder() {
    clearTasksLoading("#taskList")
    clearFilterLoading("#filterBar")
    clearStatsLoading("#statsRow")
    clearSidebarLoading("#sidebar")
}

function setTasksLoading(ulSelector, count = 5) {
    const ul = document.querySelector(ulSelector);
    if (!ul) return;

    let html = "";
    for (let i = 0; i < count; i++) {
        html += createTaskPlaceholder();
    }

    ul.dataset.original = ul.innerHTML;
    ul.innerHTML = html;
}
function clearTasksLoading(ulSelector) {
    const ul = document.querySelector(ulSelector);
    if (!ul) return;

    if (ul.dataset.original !== undefined) {
        ul.innerHTML = ul.dataset.original;
        delete ul.dataset.original;
    }
}

function setFilterLoading(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    container.dataset.original = container.innerHTML;
    container.innerHTML = createFilterPlaceholder();
}
function clearFilterLoading(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    if (container.dataset.original !== undefined) {
        container.innerHTML = container.dataset.original;
        delete container.dataset.original;
    }
}

function setStatsLoading(containerSelector) {
    const container = document.querySelector(containerSelector);

    if (!container) {
        return;
    }

    const boxes = container.querySelectorAll(".stat-box");

    boxes.forEach(box => {
        box.dataset.original = box.innerHTML;
        box.innerHTML = createStatPlaceholder();
    });
}
function clearStatsLoading(containerSelector) {
    const container = document.querySelector(containerSelector);

    if (!container)
        return;

    const boxes = container.querySelectorAll(".stat-box");

    boxes.forEach(box => {
        if (box.dataset.original) {
            box.innerHTML = box.dataset.original;
            delete box.dataset.original;
        }
    });
}

function setSidebarLoading(selector) {
    const sidebar = document.querySelector(selector);
    if (!sidebar) return;

    if (!sidebar.dataset.original)
        sidebar.dataset.original = sidebar.innerHTML;

    sidebar.innerHTML = createSidebarPlaceholder();
}
function clearSidebarLoading(selector) {
    const sidebar = document.querySelector(selector);
    if (!sidebar) return;

    if (sidebar.dataset.original) {
        sidebar.innerHTML = sidebar.dataset.original;
        delete sidebar.dataset.original;
    }
}




const CPH = {
    show(el) {
        if (!el || el.classList.contains("cph-wrap")) return;

        const wrapper = document.createElement("span");
        wrapper.className = "cph-wrap";
        wrapper.style.display = getComputedStyle(el).display === "block" ? "block" : "inline-block";

        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);

        const mask = document.createElement("span");
        mask.className = "cph-mask";
        wrapper.appendChild(mask);

        el.style.visibility = "hidden";
    },

    hide(el) {
        const wrapper = el.parentNode;
        if (!wrapper || !wrapper.classList.contains("cph-wrap")) return;

        el.style.visibility = "";
        wrapper.replaceWith(el);
    }
};




/********************
 * Bootstrap
 ********************/
document.addEventListener('DOMContentLoaded', async () => {
    if (!logged_in()) {
        navigate_login();
        return;
    }

    // Apply saved theme
    const savedTheme = currentSettings.theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : currentSettings.theme;
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    }

    // Listen for system theme changes if using auto theme
    if (currentSettings.theme === 'auto') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            document.documentElement.classList.toggle('dark', e.matches);
        });
    }

    loadContentPlaceHolders();
    const data = await state();
    clearContentPlaceHolder();

    await renderAll();
    await initializeCalendar();
    await wire();
    wireTasksPanel();

});
