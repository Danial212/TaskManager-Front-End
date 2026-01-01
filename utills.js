import { authenticatedFetch } from "./user.js";
export { getTasks, createTask, updateTask, deleteTask, getCategories, createCategories, updateCategories, deleteCategoryAPI };

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
    return response;
}

async function updateTask(task, id) {
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
    return response;
}

async function deleteTask(id) {
    const tasksURL = DomainURL + 'tasks/' + id + '/';
    const header = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    try {
        const response = await authenticatedFetch(tasksURL, {
            method: 'DELETE',
        });
    } catch (exp) {
        console.error('Errror:', exp);
    }
    return response;
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
    return response;
}

//  Must be completed
async function updateCategories(category, id) {
    const categoryURl = DomainURL + 'categories/' + id + '/';
    const header = {
        'Content-Type': 'application/json',
    }
    const response = await authenticatedFetch(categoryURl, {
        method: 'PATCH',
        body: JSON.stringify(category),
        headers: header
    });
    return response;
}

async function deleteCategoryAPI(id) {
    const categoryURL = DomainURL + 'categories/' + id + '/';
    const header = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
    const response = await authenticatedFetch(categoryURL, {
        method: 'DELETE',
    });
    return response;
}
