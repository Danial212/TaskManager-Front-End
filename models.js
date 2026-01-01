/********************
 * Model Classes
 ********************/
class Task {
    constructor(id, title, description, category, reminder, status, priority) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.reminder = reminder;
        this.status = status;
        this.priority = priority;
    }

    static fromJSON(json) {
        return new Task(
            json.id,
            json.title,
            json.description,
            json.category,
            json.reminder,
            json.status,
            json.priority
        );
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            category: this.category,
            reminder: this.reminder,
            status: this.status,
            priority: this.priority
        };
    }
}

class Category {
    constructor(id, title, color) {
        this.id = id;
        this.title = title;
        this.color = color;
    }

    static fromJSON(json) {
        return new Category(
            json.id,
            json.title,
            json.color
        );
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            color: this.color
        };
    }
}