import { authenticatedFetch } from "./user.js";
export { getTasks, createTask, updateTask, getCategories, createCategories, updateCategories };

const DomainURL = 'http://127.0.0.1:8000/'


async function getTasks() {
    const tasksURL = DomainURL + 'tasks/';
    const response = await authenticatedFetch(tasksURL, { method: 'GET' });
    return (await response.json());
}

async function createTask(task) {
    const tasksURL = DomainURL + 'tasks/';
    console.log("trying creating: " + JSON.stringify(task));
    const header = {
        'Content-Type': 'application/json',
    }
    const response = await authenticatedFetch(tasksURL,
        { method: 'POST', body: JSON.stringify(task), headers: header }
    );
    console.log(response.status);
}

async function updateTask(task) {
    const tasksURL = DomainURL + 'tasks/';
    const response = await authenticatedFetch(tasksURL, { method: 'PATCH' });
}

async function getCategories() {
    const categoryURl = DomainURL + 'categories/'
    const response = await authenticatedFetch(categoryURl, { method: 'GET' });
    return (await response.json());
}

async function createCategories(task) {
    /// must be completed ...
}

async function updateCategories(task) {
    /// must be completed ...
}
