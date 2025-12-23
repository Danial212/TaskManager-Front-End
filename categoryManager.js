// Add these functions to your script.js file

import { state, toast } from "./sharedData.js";
import { openModal, closeModal } from "./renderTemplates.js";
export { onCategoriesRouteActive }

// ============================================
// CATEGORIES MANAGER FUNCTIONS
// ============================================

// Available colors for categories
const categoryColors = [
    { name: 'Purple', value: '#9333ea', light: '#f3e8ff' },
    { name: 'Blue', value: '#3b82f6', light: '#dbeafe' },
    { name: 'Green', value: '#10b981', light: '#d1fae5' },
    { name: 'Red', value: '#ef4444', light: '#fee2e2' },
    { name: 'Orange', value: '#f97316', light: '#ffedd5' },
    { name: 'Pink', value: '#ec4899', light: '#fce7f3' },
    { name: 'Indigo', value: '#6366f1', light: '#e0e7ff' },
    { name: 'Teal', value: '#14b8a6', light: '#ccfbf1' },
    { name: 'Yellow', value: '#eab308', light: '#fef9c3' },
    { name: 'Cyan', value: '#06b6d4', light: '#cffafe' },
    { name: 'Emerald', value: '#059669', light: '#d1fae5' },
    { name: 'Violet', value: '#8b5cf6', light: '#ede9fe' }
];

let currentViewMode = 'grid'; // 'grid' or 'list'
let categorySearchTerm = '';
let categorySortMode = 'name';

// Initialize Categories Page
async function initCategoriesPage() {
    // Add Category Button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', async () => await openCategoryModal());
    }

    // Search Input
    const searchInput = document.getElementById('categorySearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
            categorySearchTerm = e.target.value.toLowerCase();
            await renderCategories();
        });
    }

    // Sort Select
    const sortSelect = document.getElementById('categorySortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', async (e) => {
            categorySortMode = e.target.value;
            await renderCategories();
        });
    }

    // View Mode Buttons
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');

    if (gridViewBtn) {
        gridViewBtn.addEventListener('click', async () => {
            currentViewMode = 'grid';
            gridViewBtn.setAttribute('data-active', 'true');
            listViewBtn.setAttribute('data-active', 'false');
            gridViewBtn.classList.add('bg-gray-100', 'dark:bg-gray-800');
            listViewBtn.classList.remove('bg-gray-100', 'dark:bg-gray-800');
            await renderCategories();
        });
    }

    if (listViewBtn) {
        listViewBtn.addEventListener('click', async () => {
            currentViewMode = 'list';
            listViewBtn.setAttribute('data-active', 'true');
            gridViewBtn.setAttribute('data-active', 'false');
            listViewBtn.classList.add('bg-gray-100', 'dark:bg-gray-800');
            gridViewBtn.classList.remove('bg-gray-100', 'dark:bg-gray-800');
            await renderCategories();
        });
    }

    await renderCategories();
    updateCategoryStats();
}

// Render Categories
async function renderCategories() {
    const gridView = document.getElementById('categoriesGridView');
    const listView = document.getElementById('categoriesListView');
    const emptyState = document.getElementById('emptyCategoriesState');
    const noResultsState = document.getElementById('noResultsState');

    if (!gridView || !listView) return;


    const data = await state();
    const categories = data.categories;

    // Filter categories
    let filtered = categories.filter(cat =>
        cat.title.toLowerCase().includes(categorySearchTerm)
    );

    // Sort categories
    filtered = await sortCategories(filtered, categorySortMode);

    // Show appropriate view
    if (currentViewMode === 'grid') {
        gridView.classList.remove('hidden');
        listView.classList.add('hidden');
        gridView.innerHTML = '';

        if (categories.length === 0) {
            gridView.classList.add('hidden');
            emptyState.classList.remove('hidden');
            noResultsState.classList.add('hidden');
        } else if (filtered.length === 0) {
            gridView.classList.add('hidden');
            emptyState.classList.add('hidden');
            noResultsState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            noResultsState.classList.add('hidden');

            filtered.forEach(async (cat) => {
                const p = await createCategoryCard(cat);
                gridView.appendChild(p);
            });
        }
    } else {
        listView.classList.remove('hidden');
        gridView.classList.add('hidden');
        listView.innerHTML = '';

        if (categories.length === 0) {
            listView.classList.add('hidden');
            emptyState.classList.remove('hidden');
            noResultsState.classList.add('hidden');
        } else if (filtered.length === 0) {
            listView.classList.add('hidden');
            emptyState.classList.add('hidden');
            noResultsState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            noResultsState.classList.add('hidden');
            filtered.forEach(async (cat) => {
                const categoryTempalte = await createCategoryListItem(cat)
                listView.appendChild(categoryTempalte);
            });
        }
    }
}

// Sort Categories
async function sortCategories(cats, mode) {
    const sorted = [...cats];
    const data = await state();
    const tasks = data.tasks;

    switch (mode) {
        case 'name':
            return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case 'name_desc':
            return sorted.sort((a, b) => b.title.localeCompare(a.title));
        case 'tasks':
            return sorted.sort((a, b) => {
                const aCount = tasks.filter(t => t.category === a.id).length;
                const bCount = tasks.filter(t => t.category === b.id).length;
                return bCount - aCount;
            });
        case 'recent':
            return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        case 'color':
            return sorted.sort((a, b) => a.color.localeCompare(b.color));
        default:
            return sorted;
    }
}

// Create Category Card (Grid View)
async function createCategoryCard(category) {
    const template = document.getElementById('categoryCardTemplate');
    const card = template.content.cloneNode(true);
    const container = card.querySelector('.category-card');
    const data = await state();
    const tasks = data.tasks;

    // Set color
    const accent = card.querySelector('.category-accent');
    const icon = card.querySelector('.category-icon');
    accent.style.background = category.color;
    icon.style.background = category.color;

    // Set content
    card.querySelector('.category-name').textContent = category.title;
    card.querySelector('.category-desc').textContent = category.description || 'No description';

    // Count tasks
    const taskCount = tasks.filter(t => t.category === category.id).length;
    card.querySelector('.category-task-count').textContent = `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`;

    // Edit button
    const editBtn = card.querySelector('.edit-category-btn');
    editBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await openCategoryModal(category);
    });

    // Delete button
    const deleteBtn = card.querySelector('.delete-category-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCategory(category.id);
    });

    // Click to view tasks
    container.addEventListener('click', () => {
        filterTasksByCategory(category.id);
    });

    return card;
}

// Create Category List Item (List View)
async function createCategoryListItem(category) {
    const template = document.getElementById('categoryListItemTemplate');
    const item = template.content.cloneNode(true);
    const container = item.querySelector('.category-list-item');
    const data = await state();
    const tasks = data.tasks;

    // Set color
    const dot = item.querySelector('.category-color-dot');
    const icon = item.querySelector('.category-icon-list');
    dot.style.background = category.color;
    icon.style.background = category.color;

    // Set content
    item.querySelector('.category-name-list').textContent = category.name;
    item.querySelector('.category-desc-list').textContent = category.description || 'No description';

    // Count tasks
    console.log("test: ", tasks[0].category);

    const taskCount = tasks.filter(t => t.category.id === category.id).length;
    item.querySelector('.category-task-count-list').textContent = taskCount;

    // Edit button
    const editBtn = item.querySelector('.edit-category-list-btn');
    editBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await openCategoryModal(category);
    });

    // Delete button
    const deleteBtn = item.querySelector('.delete-category-list-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCategory(category.id);
    });

    // Click to view tasks
    container.addEventListener('click', () => {
        filterTasksByCategory(category.id);
    });

    return item;
}

// Open Category Modal
async function openCategoryModal(category = null) {
    const isEdit = category !== null;

    const modalBody = `
        <div class="space-y-5">
            <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Category Name *
                </label>
                <input id="categoryNameInput" type="text" 
                    value="${isEdit ? category.title : ''}"
                    class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
                    placeholder="e.g., Work, Personal, Shopping" 
                    required />
            </div>
            
            <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Description (Optional)
                </label>
                <textarea id="categoryDescInput" 
                    class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none resize-none"
                    rows="3"
                    placeholder="Brief description of this category...">${isEdit ? (category.description || 'No Description') : ''}</textarea>
            </div>
            
            <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Color *
                </label>
                <div class="grid grid-cols-6 gap-3" id="categoryColorPicker">
                    ${categoryColors.map(color => `
                        <button type="button" 
                            class="color-option w-12 h-12 rounded-xl border-2 hover:scale-110 transition-transform ${isEdit && category.color === color.value ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-gray-900 dark:ring-white' : 'border-transparent'}"
                            style="background: ${color.value}"
                            data-color="${color.value}"
                            title="${color.name}">
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    openModal({
        title: (isEdit ? 'Edit Category' : 'New Category'),
        bodyHTML: modalBody,
        // isEdit? 'Save Changes': 'Create Category',
        async onSubmit() {
            const name = document.getElementById('categoryNameInput').value.trim();
            const description = document.getElementById('categoryDescInput').value.trim();
            const selectedColor = document.querySelector('.color-option.border-gray-900, .color-option.dark\\:border-white');

            if (!name) {
                toast('Please enter a category name', 'error');
                return;
            }

            if (!selectedColor) {
                toast('Please select a color', 'error');
                return;
            }

            const color = selectedColor.dataset.color;

            if (isEdit) {
                updateCategory(category.id, { name, description, color });
                toast('Category updated successfully', 'success');
            } else {
                await addCategory(name, color, description);
                toast('Category created successfully', 'success');
            }

            closeModal();
        }
    });

    // Color picker logic
    setTimeout(() => {
        const colorButtons = document.querySelectorAll('.color-option');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                colorButtons.forEach(b => {
                    b.classList.remove('border-gray-900', 'dark:border-white', 'ring-2', 'ring-offset-2', 'ring-gray-900', 'dark:ring-white');
                    b.classList.add('border-transparent');
                });
                btn.classList.remove('border-transparent');
                btn.classList.add('border-gray-900', 'dark:border-white', 'ring-2', 'ring-offset-2', 'ring-gray-900', 'dark:ring-white');
            });
        });
    }, 100);
}

// Add Category
async function addCategory(name, color, description = '') {
    const newCategory = {
        id: `cat_${Date.now()}`,
        name,
        color,
        description,
        createdAt: new Date().toISOString()
    };

    await createCategory(newCategory);
    await saveCategory();
    await renderCategories();
    updateCategoryStats();
    updateAllCategoryDropdowns();
}

// Update Category
async function updateCategory(id, updates) {
    const data = await state();
    const categories = data.categories;
    const index = categories.findIndex(c => c.id === id);
    if (index !== -1) {
        categories[index] = { ...categories[index], ...updates };
        await saveCategory();
        await renderCategories();
        updateCategoryStats();
        updateAllCategoryDropdowns();
    }
}

// Delete Category
async function deleteCategory(id) {
    const category = categories.find(c => c.id === id);
    if (!category) return;

    const taskCount = tasks.filter(t => t.category === id).length;

    const message = taskCount > 0
        ? `Are you sure you want to delete "${category.title}"? This will remove the category from ${taskCount} task(s).`
        : `Are you sure you want to delete "${category.title}"?`;

    if (!confirm(message)) return;

    // Remove category from tasks
    tasks.forEach(task => {
        if (task.category.id === id) {
            task.category = null;
        }
    });

    // Remove category
    const index = categories.findIndex(c => c.id === id);
    if (index !== -1) {
        categories.splice(index, 1);
        await saveCategory();
        await renderCategories();
        updateCategoryStats();
        updateAllCategoryDropdowns();
        toast('Category deleted successfully', 'success');
    }
}

// Update Category Stats
async function updateCategoryStats() {
    const totalCount = document.getElementById('totalCategoriesCount');
    const totalTasks = document.getElementById('totalTasksInCategories');
    const mostUsed = document.getElementById('mostUsedCategory');
    const colorsUsed = document.getElementById('colorsUsedCount');

    const data = await state();
    const categories = data.categories;
    const tasks = data.tasks;

    if (totalCount) totalCount.textContent = categories.length;

    if (totalTasks) {

        const categorizedTasks = tasks.filter(t => t.category).length;
        totalTasks.textContent = categorizedTasks;
    }

    if (mostUsed) {
        const categoryCounts = {};
        categories.forEach(cat => {
            categoryCounts[cat.id] = tasks.filter(t => t.category === cat.id).length;
        });

        const mostUsedId = Object.keys(categoryCounts).reduce((a, b) =>
            categoryCounts[a] > categoryCounts[b] ? a : b, null
        );

        const mostUsedCat = categories.find(c => c.id === mostUsedId);
        mostUsed.textContent = mostUsedCat ? mostUsedCat.name : '-';
    }

    if (colorsUsed) {
        const uniqueColors = new Set(categories.map(c => c.color));
        colorsUsed.textContent = uniqueColors.size;
    }
}

// Filter Tasks by Category
function filterTasksByCategory(categoryId) {
    // Navigate to All Tasks view

    // Probaely unnesecery
    // switchRoute('tasks');

    // Apply category filter
    setTimeout(() => {
        const filterCheckboxes = document.querySelectorAll('[data-filter-category]');
        filterCheckboxes.forEach(cb => {
            cb.checked = cb.dataset.filterCategory === categoryId;
        });

        // Trigger filter update
        if (window.applyAllTasksFilters) {
            window.applyAllTasksFilters();
        }

        toast(`Showing tasks in category`, 'info');
    }, 100);
}

// Update all category dropdowns throughout the app
function updateAllCategoryDropdowns() {
    // This will refresh category selects in task modals, filters, etc.
    // Call this whenever categories change
    if (window.renderAllTasks) {
        window.renderAllTasks();
    }
    if (window.renderTaskList) {
        window.renderTaskList();
    }
}

// Call this when the route changes to categories
function onCategoriesRouteActive() {
    initCategoriesPage();
}

// Export functions if needed
if (typeof window !== 'undefined') {
    window.initCategoriesPage = initCategoriesPage;
    window.onCategoriesRouteActive = onCategoriesRouteActive;
    window.openCategoryModal = openCategoryModal;
}

async function saveCategory() {
    console.log('save shit must happens here');
        
}

async function createCategory(category) {
    console.log('save shit must happens here');
    
}