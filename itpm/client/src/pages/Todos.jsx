import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

export default function TodosPage() {
  const [todos, setTodos] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTodos = async () => {
    try {
      const data = await apiFetch("/todos");
      setTodos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const submitTodo = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch("/todos", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          priority: form.get("priority"),
          dueDate: form.get("dueDate") || undefined
        })
      });
      e.target.reset();
      await loadTodos();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateTodoStatus = async (id, status) => {
    try {
      await apiFetch(`/todos/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await loadTodos();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteTodo = async (id) => {
    if (!confirm("Delete this task?")) return;
    try {
      await apiFetch(`/todos/${id}`, { method: "DELETE" });
      await loadTodos();
    } catch (err) {
      setError(err.message);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = { Low: "#10b981", Medium: "#f59e0b", High: "#ef4444" };
    return colors[priority] || "#6b7280";
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  const completed = todos.filter((t) => t.status === "Completed").length;
  const progress = todos.length ? Math.round((completed / todos.length) * 100) : 0;

  return (
    <div className="page">
      <Section title="Create New Task">
        {error && <p className="error">{error}</p>}
        <form className="form-grid" onSubmit={submitTodo}>
          <div className="form-group full-width">
            <label>Task Title *</label>
            <input type="text" name="title" placeholder="What needs to be done?" required />
          </div>
          <div className="form-group full-width">
            <label>Description</label>
            <textarea name="description" placeholder="Add details..."></textarea>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select name="priority">
              <option>Medium</option>
              <option>Low</option>
              <option>High</option>
            </select>
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input type="datetime-local" name="dueDate" />
          </div>
          <button type="submit" className="btn-primary">Add Task</button>
        </form>
      </Section>

      <Section title={`My Tasks (${completed}/${todos.length} Complete)`}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        
        {todos.length === 0 ? (
          <p className="empty">No tasks yet. Great job! 🎉</p>
        ) : (
          <div className="todos-list">
            {todos.map((todo) => (
              <div key={todo._id} className={`todo-item todo-${todo.status.toLowerCase()}`}>
                <div className="todo-left">
                  <input
                    type="checkbox"
                    checked={todo.status === "Completed"}
                    onChange={(e) => updateTodoStatus(todo._id, e.target.checked ? "Completed" : "Pending")}
                  />
                  <div className="todo-content">
                    <h3 className={todo.status === "Completed" ? "completed" : ""}>{todo.title}</h3>
                    {todo.description && <p>{todo.description}</p>}
                    {todo.dueDate && <p className="due-date">📅 {new Date(todo.dueDate).toLocaleDateString()}</p>}
                  </div>
                </div>
                <div className="todo-right">
                  <span className="priority-badge" style={{ backgroundColor: getPriorityColor(todo.priority) }}>
                    {todo.priority}
                  </span>
                  <span className={`status-badge status-${todo.status.toLowerCase()}`}>
                    {todo.status}
                  </span>
                  <button onClick={() => deleteTodo(todo._id)} className="btn-delete">❌</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
