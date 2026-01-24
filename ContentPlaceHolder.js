export {createSidebarPlaceholder, createFilterPlaceholder, createTaskPlaceholder, createStatPlaceholder}

export function taskPlaceHolder() {
    return `<li
        class="py-10 flex gap-4 group my-3 bg-gray-100 dark:hover:bg-gray-800/30 -mx-2 px-2 rounded-xl transition-colors">
    </li>
    `
}

export function tasksStatusPlaceHolder() {
    return `div
        class="content-place-holder py-3 flex gap-4 group my-3 bg-red-100 dark:hover:bg-gray-800/30 -mx-2 px-4 rounded-xl transition-colors">
        <style>
        .content-place-holder {
            width: 50%;
            height: 90%;
            /* display: flex; */
            align-items: center;
            justify-items: center;
            
        }
    </style>
    </div>
    `
}

function createStatPlaceholder() {
  return `
    <div class="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 shadow-sm animate-pulse">
      
      <div class="flex items-center justify-between mb-3">
        <div class="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div class="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
      </div>

      <div class="h-10 w-16 rounded bg-gray-200 dark:bg-gray-700"></div>
    </div>
  `;
}

function createTaskPlaceholder() {
  return `
    <li class="py-4 flex gap-4 animate-pulse -mx-2 px-2 rounded-xl">
      
      <!-- Checkbox -->
      <div class="mt-1 w-5 h-5 rounded-lg bg-gray-200 dark:bg-gray-700"></div>

      <div class="flex-1 min-w-0">
        
        <!-- Title + Priority -->
        <div class="flex items-start gap-2 mb-2">
          <div class="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div class="h-5 w-16 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
        </div>

        <!-- Description -->
        <div class="h-3 w-full rounded bg-gray-200 dark:bg-gray-700 mb-1"></div>
        <div class="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700 mb-2"></div>

        <!-- Meta row -->
        <div class="flex items-center gap-4">
          <div class="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div class="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div class="h-5 w-24 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1">
        <div class="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
        <div class="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
        <div class="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
      </div>
    </li>
  `;
}

function createFilterPlaceholder() {
  return `
    <section class="flex flex-wrap items-center gap-3 animate-pulse">

      <!-- Filter buttons -->
      <div class="h-10 w-28 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
      <div class="h-10 w-24 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
      <div class="h-10 w-32 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
      <div class="h-10 w-20 rounded-xl bg-gray-200 dark:bg-gray-700"></div>

      <!-- Sort section -->
      <div class="ml-auto flex items-center gap-3">
        <div class="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div class="h-10 w-40 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
      </div>

    </section>
  `;
}


function createSidebarPlaceholder() {
  return `
  <aside id="sidebar"
    class="lg:flex lg:flex-col w-60 shrink-0 border-r border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop animate-pulse"
  >
    <!-- Header -->
    <div class="flex items-center gap-3 px-6 h-20 border-b border-gray-200/50 dark:border-gray-800/50">
      <div class="w-11 h-11 rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
      <div class="flex-1">
        <div class="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-2"></div>
        <div class="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700"></div>
      </div>
    </div>

    <!-- Nav -->
    <nav class="p-5 space-y-2 flex-1 overflow-y-auto">
      ${Array.from({ length: 6 }).map(() => `
        <div class="flex items-center gap-3 px-4 py-3 rounded-xl">
          <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div class="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      `).join("")}
    </nav>

    <!-- Footer user card -->
    <div class="p-5 border-t border-gray-200/50 dark:border-gray-800/50">
      <div class="flex items-center gap-3 p-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
        <div class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        <div class="flex-1">
          <div class="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700 mb-2"></div>
          <div class="h-3 w-36 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
        <div class="h-8 w-16 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
      </div>
    </div>
  </aside>
  `;
}
