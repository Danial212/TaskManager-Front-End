import {
    PRIORITY_BADGE, STATUS_LABEL, STATUS_LABEL_Array, PRIORITY_LABEL, GetStatusLabel, $, $$, fmtDate, todayISO, getTextColor
    , fetchState, getCachdData, saveStateIntoCache, fetchNewData, state
} from "./sharedData.js";
export { taskItemTemplate, renderCategories, taskForm, openNewCategory, openEditTask, openNewTask, closeModal, openModal }


async function taskItemTemplate(data, t, taskDone) {
    const cat = data.categories.find(c => c.id === t.category);

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
            <span class="inline-flex font-semibold items-center text-xs rounded-lg px-3 py-1" 
                  style="background-color: ${cat.color}; color: ${getTextColor(cat.color)}">
              ${cat.title || ''}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors" data-action="edit" data-id="${t.id}" title="Edit task">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-action="move" data-id="${t.id}" title="Move task">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
          </button>
          <button class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors" data-action="delete" data-id="${t.id}" title="Delete task">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </li>`;
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
    const catOpts = (await state()).categories.map(c => `<option value="${c.id}" ${t.category === c.id ? 'selected' : ''}>${c.title}</option>`).join('');
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
        onSubmit() {
            const name = $('#c-name').value.trim();
            const color = $('#c-color').value;
            if (!name) {
                toast('Name is required', 'error');
                return false;
            }
            createCategories(
                {
                    title: name.toLowerCase(),
                    color: color
                });
            fetchNewData();
            renderAll();
            toast('Category added successfully');
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
    primary.onclick = () => { if (onSubmit?.() !== false) closeModal(); };
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
                proirity: 'h',
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
                createTask(t);
                fetchNewData();
                renderAll();
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
