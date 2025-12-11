// Main containers
const tasksList = document.getElementById('allTasksList');
const emptyState = document.getElementById('emptyAllTasks');
const taskCount = document.getElementById('taskCount');

// Filters
const statusFilters = document.querySelectorAll('[data-filter-status]');
const priorityFilters = document.querySelectorAll('[data-filter-priority]');
const dateFilters = document.querySelectorAll('[data-filter-date]');
const categoryFilters = document.getElementById('categoryFilterList');
const clearFiltersBtn = document.getElementById('clearAllFilters');

// Sort
const sortDropdown = document.getElementById('sortTasksView');