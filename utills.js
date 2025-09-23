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
    const header = {
        'Content-Type': 'application/json',
    }
    const response = await authenticatedFetch(tasksURL,
        {
            method: 'POST',
            body: JSON.stringify(task),
            headers: header
        }
    );
}

async function updateTask(task, id) {
    console.log(JSON.stringify(task));
    const tasksURL = DomainURL + 'tasks/' + id + '/';
    const header = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    const response = await authenticatedFetch(tasksURL, {
        method: 'PATCH',
        body: JSON.stringify(task),
        headers: header
    });
}

async function getCategories() {
    const categoryURl = DomainURL + 'categories/'
    const response = await authenticatedFetch(categoryURl, { method: 'GET' });
    return (await response.json());
}

async function createCategories(category) {
    const categoryURl = DomainURL + 'categories/';
    const header = {
        'Content-Type': 'application/json',
    };
    const response = await authenticatedFetch(categoryURl, {
        method: 'POST',
        body: JSON.stringify(category),
        headers: header
    });
}

//  Must be completed
async function updateCategories(category, id) {
    const categoryURl = DomainURL + 'categories/' + id;
    const header = {
        'Content-Type': 'application/json',
    }
    const response = await authenticatedFetch(categoryURl, {
        method: 'PATCH',
        body: JSON.stringify(category),
        headers: header
    });
}
