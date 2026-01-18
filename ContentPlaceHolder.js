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