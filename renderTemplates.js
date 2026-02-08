import { re_RenderAll } from "./script.js";
import {
  PRIORITY_BADGE, STATUS_LABEL, STATUS_LABEL_Array, PRIORITY_LABEL, GetStatusLabel, $, $$, fmtDate, todayISO, getTextColor
  , fetchNewData, state,
  NULL_CATEGORY_TITLE,

} from "./sharedData.js";
import { getTasks, createTask, updateTask, deleteTask, getCategories, createCategories, updateCategories } from "./utills.js";
export { deleteConfirmMenu, settingsSectionTemplate, settingsSelectTemplate, settingsToggleTemplate, render_mono_category, render_mono_calander_day, taskItemTemplate, taskItemTemplate_complete, renderCategories, taskForm, openNewCategory, /*openEditTask, openNewTask,*/ closeModal, openModal }


async function taskItemTemplate(data, t, taskDone) {
  const cat = data.categories.find(c => c.id === t.category);

  const categoryBadge = document.createElement('span');
  categoryBadge.className = "inline-flex font-semibold items-center text-xs rounded-lg px-3 py-1";
  categoryBadge.textContent = 'No Category';
  if (cat) {
    categoryBadge.style.backgroundColor = cat.color;
    categoryBadge.style.color = getTextColor(cat.color);
    categoryBadge.textContent = cat.title;
  }


  return `
      <li class="py-4 flex gap-4 group hover:bg-gray-50 dark:hover:bg-gray-800/30 -mx-2 px-2 rounded-xl transition-colors">
        <input type="checkbox" ${taskDone(t) ? 'checked' : ''} data-action="toggle-complete" data-id="${t.id}" class="mt-1 w-5 h-5 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer accent-blue-600">
        <div class="flex-1 min-w-0">
          <div class="flex items-start gap-2 mb-2">
            <h4 class="font-semibold text-gray-900 dark:text-white truncate flex-1 cursor-text focus:outline-none" data-id="${t.id}"
            contenteditable="true">${t.title}
            </h4>
            <span class="text-xs font-bold rounded-lg px-3 py-1 ${PRIORITY_BADGE[t.proirity]}">${t.proirity.toUpperCase()}</span>
          </div>
          ${t.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">${t.description}</p>` : ''}
          <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span class="inline-flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              ${fmtDate(t.reminder)}
            </span>
            <span class="inline-flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              ${STATUS_LABEL[t.status]}
            </span>
            ${categoryBadge.outerHTML}

          </div >
        </div >
  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
    <button class="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors" data-action="edit" data-id="${t.id}" title="Edit task">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
    <button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-action="move" data-id="${t.id}" title="Move task">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    </button>
    <button class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors" data-action="delete" data-id="${t.id}" title="Delete task">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
      </li > `;
}


async function taskItemTemplate_complete(data, t, taskDone) {
  const cat = data.categories.find(c => c.id === t.category);
  const isComplete = taskDone(t);

  const priorityStyles = {
    high: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-900/50',
    medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-900/50',
    low: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-900/50'
  };

  const statusConfig = {
    toDo: {
      icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>`,
      label: 'To Do',
      color: 'text-gray-600 dark:text-gray-400'
    },
    inProgress: {
      icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>`,
      label: 'In Progress',
      color: 'text-blue-600 dark:text-blue-400'
    },
    Done: {
      icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>`,
      label: 'Done',
      color: 'text-emerald-600 dark:text-emerald-400'
    }
  };

  const currentStatus = statusConfig[t.status] || statusConfig.toDo;

  return `
    <li class="group relative" role="listitem">
      <article 
        class="relative p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800/60 
               shadow-sm hover:shadow-xl hover:shadow-gray-900/5 dark:hover:shadow-black/20
               hover:border-blue-300/60 dark:hover:border-blue-700/40 
               transition-all duration-300 ease-out
               ${isComplete ? 'opacity-50 hover:opacity-60' : 'hover:-translate-y-0.5'}"
        aria-label="Task: ${t.title}"
      >
        <div class="flex gap-5">
          <!-- Checkbox Section -->
          <div class="shrink-0 pt-1">
            <label class="relative flex items-center justify-center cursor-pointer group/checkbox">
              <input 
                type="checkbox" 
                ${isComplete ? 'checked' : ''} 
                data-action="toggle-complete" 
                data-id="${t.id}"
                aria-label="Mark task as ${isComplete ? 'incomplete' : 'complete'}"
                class="peer w-6 h-6 rounded-lg border-2 border-gray-300 dark:border-gray-600 
                       cursor-pointer appearance-none checked:bg-blue-600 checked:border-blue-600
                       hover:border-blue-500 dark:hover:border-blue-500
                       focus:outline-hidden focus:ring-3 focus:ring-blue-500/20
                       transition-all duration-200"
              >
              <svg 
                class="absolute w-4 h-4 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity duration-200" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            </label>
          </div>

          <!-- Main Content Section -->
          <div class="flex-1 min-w-0 space-y-3">
            <!-- Title & Priority Row -->
            <div class="flex items-start gap-3">
              <h4 
                class="flex-1 font-semibold text-lg text-gray-900 dark:text-white 
                       cursor-text focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                       dark:focus:ring-offset-gray-900 rounded-lg px-2 py-1 -mx-2 -my-1
                       hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors
                       ${isComplete ? 'line-through decoration-2 text-gray-500 dark:text-gray-500' : ''}" 
                data-id="${t.id}"
                contenteditable="true"
                role="textbox"
                aria-label="Task title"
              >
                ${t.title}
              </h4>
              <span 
                class="shrink-0 text-xs font-bold uppercase tracking-wide rounded-xl px-3 py-2 ${priorityStyles[t.proirity] || priorityStyles.low}"
                role="status"
                aria-label="Priority: ${t.proirity}"
              >
                ${t.proirity}
              </span>
            </div>

            <!-- Description -->
            ${t.description ? `
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                ${t.description}
              </p>
            ` : ''}

            <!-- Metadata Row -->
            <div class="flex flex-wrap items-center gap-3 text-xs">
              <!-- Due Date Badge -->
              <span 
                class="inline-flex items-center gap-2 px-3 py-2 rounded-xl 
                       bg-gray-50 dark:bg-gray-800/80 
                       text-gray-700 dark:text-gray-300 font-medium
                       ring-1 ring-gray-200/50 dark:ring-gray-700/50
                       hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Due date"
              >
                <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>${fmtDate(t.reminder)}</span>
              </span>

              <!-- Status Badge -->
              <span 
                class="inline-flex items-center gap-2 px-3 py-2 rounded-xl 
                       bg-gray-50 dark:bg-gray-800/80 
                       ${currentStatus.color} font-medium
                       ring-1 ring-gray-200/50 dark:ring-gray-700/50
                       hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                role="status"
                aria-label="Status: ${currentStatus.label}"
              >
                ${currentStatus.icon}
                <span>${currentStatus.label}</span>
              </span>

              <!-- Category Badge -->
              ${cat ? `
                <span 
                  class="inline-flex items-center gap-2 font-semibold px-3 py-2 rounded-xl
                         hover:brightness-95 dark:hover:brightness-110 transition-all" 
                  style="background: linear-gradient(135deg, ${cat.color}15, ${cat.color}08); 
                         color: ${cat.color}; 
                         border: 1.5px solid ${cat.color}30;"
                  title="Category: ${cat.title}"
                >
                  <span class="w-2 h-2 rounded-full shadow-sm" style="background-color: ${cat.color}"></span>
                  <span>${cat.title}</span>
                </span>
              ` : ''}
            </div>
          </div>

          <!-- Action Buttons Section -->
          <div class="shrink-0 flex items-start gap-1.5 
                      opacity-0 group-hover:opacity-100 
                      transition-opacity duration-300 ease-out"
               role="toolbar"
               aria-label="Task actions">
            <button 
              class="p-2.5 rounded-xl 
                     bg-transparent hover:bg-blue-50 dark:hover:bg-blue-950/50
                     text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 
                     hover:ring-1 hover:ring-blue-200 dark:hover:ring-blue-800
                     transition-all duration-200 hover:scale-105 active:scale-95" 
              data-action="edit" 
              data-id="${t.id}" 
              title="Edit task"
              aria-label="Edit task"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button 
              class="p-2.5 rounded-xl 
                     bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800
                     text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 
                     hover:ring-1 hover:ring-gray-200 dark:hover:ring-gray-700
                     transition-all duration-200 hover:scale-105 active:scale-95" 
              data-action="move" 
              data-id="${t.id}" 
              title="Move task"
              aria-label="Move task"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
              </svg>
            </button>
            <button 
              class="p-2.5 rounded-xl 
                     bg-transparent hover:bg-red-50 dark:hover:bg-red-950/50
                     text-gray-400 hover:text-red-600 dark:hover:text-red-400 
                     hover:ring-1 hover:ring-red-200 dark:hover:ring-red-800
                     transition-all duration-200 hover:scale-105 active:scale-95" 
              data-action="delete" 
              data-id="${t.id}" 
              title="Delete task"
              aria-label="Delete task"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      </article>
    </li>
  `;
}


// Category Layout Configuration
const CATEGORY_LAYOUT_CONFIG = {
  // Character threshold for determining layout
  // Categories with names longer than this will take full width
  // Shorter names will be displayed 2 per row
  lengthThreshold: 12,

  // Maximum characters to display before truncation
  maxDisplayLength: 20,

  // Truncation suffix
  truncationSuffix: '...'
};

/**
 * Renders a single category card with flexible layout support
 * @param {Object} c - Category object
 * @param {Object} options - Optional configuration overrides
 * @returns {Promise<string>} HTML string for the category card
 */
async function render_mono_category(c, options = {}) {
  const data = await state();
  const title = c.title?.trim() || 'Untitled';
  const taskCount = data.tasks.filter(t => t.category === c.id).length;
  const categoryColor = c?.color?.trim() || '#9CA3AF';

  return `
    <label class="category-filter-item flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all group">
      <input type="checkbox" 
             class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-pink-600 focus:ring-2 focus:ring-pink-500 focus:ring-offset-0 transition-all" 
             data-filter-category="${c.id}">
      <div class="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-800 ring-transparent group-hover:ring-gray-200 dark:group-hover:ring-gray-700 transition-all" 
           style="background: ${categoryColor};"></div>
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate" title="${title}">${title}</span>
      <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">${taskCount}</span>
    </label>
  `;
}

/**
 * @param {boolean} task - is the menu for deleting a task?
 * @param {string} subjectTitle - title of what we are deleting.
 * @returns 
 */
function deleteConfirmMenu(task = true, subjectTitle) {
  return `
            <div class="text-center py-6">
                <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </div>
                <h4 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete ${task ? 'Task' : 'Category'}?</h4>
                <p class="text-gray-600 dark:text-gray-400 mb-4">Are you sure you want to delete <strong>"${subjectTitle}"</strong>? This action cannot be undone.</p>
                <div class="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    ${task ? "<span>Tip: You can also drag tasks to different dates to reschedule them</span>" : ""}
                </div>
            </div>
        `
}


// Calendar's everty day's template
// Calendar's every day's template
function render_mono_calander_day(day, month, year, isCurrentMonth, isToday, isSelected, taskCount) {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return `
    <div 
      class="cal-day group bg-white dark:bg-gray-900 min-h-[100px] p-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-lg ${!isCurrentMonth ? 'opacity-40 hover:opacity-60' : ''
    } ${isToday ? 'ring-2 ring-blue-500 ring-inset shadow-md' : ''
    } ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400 ring-inset' : ''
    }"
      data-date="${dateStr}"
      title="${isCurrentMonth ? 'Double-click to add task, drag tasks here to reschedule' : 'Click to view'}"
    > 
      <div class="flex items-start justify-between mb-2">
        <span class="text-sm font-semibold transition-all ${isToday
      ? 'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm'
      : isSelected
        ? 'text-blue-700 dark:text-blue-300'
        : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
    }"> 
          ${day}
        </span>
        ${taskCount > 0 ? `
          <span class="text-xs font-bold px-2 py-0.5 rounded-full transition-all ${taskCount > 5
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'
        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800'
      }">
            ${taskCount}
          </span>
        ` : ''}
      </div>
      ${taskCount > 0 ? `
        <div class="space-y-1">
          ${taskCount <= 3 ? `
            ${Array(taskCount).fill(0).map(() => `
              <div class="w-full h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 shadow-sm"></div>
            `).join('')}
          ` : `
            <div class="text-xs font-medium text-gray-600 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              ${taskCount} tasks
            </div>
          `}
        </div>
      ` : `
        <div class="text-xs text-gray-400 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
          Double-click to add task
        </div>
      `}
    </div>
  `;
}

async function renderCategories() {
  const data = await state();
  const wrap = $('#categoryGrid');

  const screenWidth = window.innerWidth;
  const LST = 15;
  const MST = 12;
  const SST = 10;
  const VSST = 9;

  const maxTitleLength = screenWidth > 1200 ? LST : screenWidth > 750 ? MST : screenWidth > 500 ? SST : VSST;
  wrap.innerHTML = data.categories.map(c => {
    let title = c.title.trim();
    if (title.length > maxTitleLength)
      title = title.slice(0, maxTitleLength) + '...';

    return `
        <button class="group p-4 rounded-xl border border-gray-200 dark:border-gray-800 text-left hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 hover:-translate-y-1" data-cat="${c.id}">
          <div class="flex items-center gap-3">
            <span   class="inline-block w-4 h-4 flex-shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 transition-transform duration-200 group-hover:scale-110"
                    style="background:${c?.color?.trim() ? c.color : '#9CA3AF'}"></span>
            <span class="font-semibold flex-1">${title}</span>
            <span class="text-xs font-bold text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800">${data.tasks.filter(t => t.category === c.id).length}</span>
          </div>
        </button>
      `}).join('');
}

async function taskForm(t = {}) {
  let catOpts = (await state()).categories.map(c => `<option value="${c.id}" ${t.category === c.id ? 'selected' : ''}>${c.title}</option>`).join('');
  catOpts = `<option value="${NULL_CATEGORY_TITLE}" ${t.category ? '' : 'selected'}>No Category</option>` + catOpts
  const statusOpts = Object.entries(STATUS_LABEL).map(([label, value]) => `<option ${t.status === label ? 'selected' : ''} value="${label}">${value}</option>`).join('');
  const priorityOpts = Object.entries(PRIORITY_LABEL).map(([label, value]) => `<option ${t.proirity === label ? 'selected' : ''} value="${label}">${value}</option>`).join('');

  return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Title</label>
            <input id="f-title" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" value="${t.title || ''}" placeholder="Enter task title"/>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
            <input id="f-due" type="date" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" value="${t.reminder ? new Date(t.reminder).toISOString().slice(0, 10) : ''}"/>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Priority</label>
            <select id="f-priority" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer">${priorityOpts}</select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <select id="f-status" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer">${statusOpts}</select>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category</label>
            <select id="f-category" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer">${catOpts}</select>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea id="f-desc" rows="4" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none" placeholder="Add task description...">${t.description || ''}</textarea>
          </div>
        </div>`;
}

async function openNewCategory() {
  const categories = (await state()).categories;
  openModal({
    title: 'New Category',
    bodyHTML: `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category Name</label>
            <input id="c-name" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Enter category name"/>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <input id="c-color" type="color" value="#6366f1" class="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer"/>
          </div>
        </div>`,
    async onSubmit() {
      const name = $('#c-name').value.trim();
      const color = $('#c-color').value;
      if (!name) {
        toast('Name is required', 'error');
        return false;
      }
      createCategories(
        {
          title: name.toLowerCase(),
          // some hit must be here for handing the description
          color: color
        });
      await fetchNewData();
      await re_RenderAll();
    }
  });
}

async function openModal({ title, bodyHTML, onSubmit }) {
  const overlay = $('#modalOverlay');
  overlay.innerHTML = '';

  const tpl = document.importNode($('#modalTemplate').content, true);
  tpl.querySelector('#modalTitle').textContent = title;

  const body = tpl.querySelector('#modalBody');
  body.innerHTML = (await bodyHTML);

  const primary = tpl.querySelector('#modalPrimary');
  primary.onclick = () => {
    if (onSubmit?.() !== false) closeModal();
  };
  tpl.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModal));
  overlay.appendChild(tpl);
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => overlay.querySelector('input,textarea,select,button')?.focus(), 0);
}

function closeModal() {
  const overlay = $('#modalOverlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '';
}

async function openNewTask() {
  const data = await state();

  openModal({
    title: 'New Task',
    bodyHTML: taskForm(
      {
        status: 'toDo',
        proirity: 'medium',
        category: data.categories[0]?.id || '',
        reminder: new Date().toISOString()
      }
    ),
    async onSubmit() {
      const t = {
        title: $('#f-title').value.trim(),
        description: $('#f-desc').value.trim(),
        category: $('#f-category').value,
        reminder: $('#f-due').value ? new Date($('#f-due').value).toISOString() : new Date().toISOString(),
        status: $('#f-status').value.trim(),
        proirity: $('#f-priority').value
      };
      if (!t.title) {
        toast('Title is required', 'error');
        return false;
      }
      try {
        await createTask(t);
        re_render
        // await fetchNewData();
        // await renderAll();
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
      await updateTask(t, id);
      await fetchNewData();
      await renderAll();
      toast('Task updated successfully');
    }
  });
}

/********************
 * Settings UI Components
 ********************/
function settingsToggleTemplate(id, label, description, checked = false) {
  return `
        <div class="flex items-center justify-between p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-all">
            <div class="flex-1 min-w-0">
                <label for="${id}" class="flex items-center gap-3 cursor-pointer">
                    <div class="relative">
                        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} 
                               class="peer sr-only settings-toggle"
                               data-setting="${id}">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full 
                                    peer peer-checked:after:translate-x-full 
                                    peer-checked:after:border-white after:content-[''] 
                                    after:absolute after:top-[2px] after:left-[2px] 
                                    after:bg-white after:rounded-full after:h-5 after:w-5 
                                    after:transition-all peer-checked:bg-blue-600 
                                    dark:bg-gray-700 dark:peer-checked:bg-blue-500"></div>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">${label}</p>
                        ${description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${description}</p>` : ''}
                    </div>
                </label>
            </div>
        </div>
    `;
}

function settingsSelectTemplate(id, label, options, value) {
  const optionsHtml = options.map(opt =>
    `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`
  ).join('');

  return `
        <div class="space-y-2">
            <label for="${id}" class="text-sm font-semibold text-gray-700 dark:text-gray-300">${label}</label>
            <select id="${id}" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 
                                      bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 
                                      focus:border-transparent transition-all cursor-pointer settings-select"
                    data-setting="${id}">
                ${optionsHtml}
            </select>
        </div>
    `;
}

function settingsSectionTemplate(title, content) {
  return `
        <div class="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 shadow-lg">
            <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                ${title}
            </h3>
            <div class="space-y-3">${content}</div>
        </div>
    `;
}

