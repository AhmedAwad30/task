const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const db = new sqlite3.Database('./tasks.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT
        )`);
    }
});

app.post('/tasks', (req, res) => {
    const { title, description, status } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: "Validation Error: 'title' is required and cannot be empty." });
    }

    const taskTitle = title.trim();
    const taskDesc = description || "";
    const taskStatus = status || "pending";
    const createdAt = new Date().toISOString();

    const sql = `INSERT INTO tasks (title, description, status, created_at) VALUES (?, ?, ?, ?)`;
    db.run(sql, [taskTitle, taskDesc, taskStatus, createdAt], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            id: this.lastID,
            title: taskTitle,
            description: taskDesc,
            status: taskStatus,
            created_at: createdAt
        });
    });
});

app.get('/tasks', (req, res) => {
    const sql = `SELECT * FROM tasks`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(rows);
    });
});

app.get('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const sql = `SELECT * FROM tasks WHERE id = ?`;
    db.get(sql, [taskId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: `Task with ID ${taskId} not found.` });
        }
        res.status(200).json(row);
    });
});

app.put('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const { title, description, status } = req.body;

    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
        return res.status(400).json({ error: "Validation Error: 'title' cannot be empty." });
    }

    db.get(`SELECT * FROM tasks WHERE id = ?`, [taskId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: `Task with ID ${taskId} not found.` });

        const newTitle = title !== undefined ? title.trim() : row.title;
        const newDesc = description !== undefined ? description : row.description;
        const newStatus = status !== undefined ? status : row.status;

        const updateSql = `UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ?`;
        db.run(updateSql, [newTitle, newDesc, newStatus, taskId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(200).json({
                id: taskId,
                title: newTitle,
                description: newDesc,
                status: newStatus,
                created_at: row.created_at
            });
        });
    });
});

app.delete('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const sql = `DELETE FROM tasks WHERE id = ?`;
    db.run(sql, [taskId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: `Task with ID ${taskId} not found.` });
        }
        res.status(200).json({ message: `Task with ID ${taskId} deleted successfully.` });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
