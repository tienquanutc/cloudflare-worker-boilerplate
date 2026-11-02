import { useEffect, useState, type FormEvent } from "react";
import type { Todo } from "../shared/todo";
import { api } from "./api";

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  /** Chạy một thao tác API, hiện lỗi nếu có. */
  async function run(action: () => Promise<void>) {
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    run(async () => setTodos(await api.list())).finally(() => setLoading(false));
  }, []);

  function add(event: FormEvent) {
    event.preventDefault();
    run(async () => {
      const todo = await api.create({ title });
      setTodos((list) => [...list, todo]);
      setTitle("");
    });
  }

  function update(id: number, data: Partial<Pick<Todo, "title" | "done">>) {
    run(async () => {
      const todo = await api.update(id, data);
      setTodos((list) => list.map((t) => (t.id === id ? todo : t)));
    });
  }

  function remove(id: number) {
    run(async () => {
      await api.remove(id);
      setTodos((list) => list.filter((t) => t.id !== id));
    });
  }

  const left = todos.filter((t) => !t.done).length;

  return (
    <main>
      <h1>Todo</h1>

      <form onSubmit={add}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Việc cần làm…" maxLength={200} />
        <button type="submit" disabled={!title.trim()}>
          Thêm
        </button>
      </form>

      {error && <p className="error">Lỗi: {error}</p>}

      {loading ? (
        <p className="muted">Đang tải…</p>
      ) : todos.length === 0 ? (
        <p className="muted">Chưa có việc nào.</p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onUpdate={update} onRemove={remove} />
          ))}
        </ul>
      )}

      {todos.length > 0 && (
        <p className="muted">
          Còn {left} / {todos.length} việc
        </p>
      )}
    </main>
  );
}

type ItemProps = {
  todo: Todo;
  onUpdate: (id: number, data: Partial<Pick<Todo, "title" | "done">>) => void;
  onRemove: (id: number) => void;
};

function TodoItem({ todo, onUpdate, onRemove }: ItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);

  function save(event: FormEvent) {
    event.preventDefault();
    if (draft.trim() && draft !== todo.title) onUpdate(todo.id, { title: draft });
    setEditing(false);
  }

  if (editing) {
    return (
      <li>
        <form onSubmit={save}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={200} autoFocus />
          <button type="submit">Lưu</button>
          <button type="button" onClick={() => setEditing(false)}>
            Huỷ
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className={todo.done ? "done" : undefined}>
      <label>
        <input type="checkbox" checked={todo.done} onChange={(e) => onUpdate(todo.id, { done: e.target.checked })} />
        <span>{todo.title}</span>
      </label>
      <button type="button" onClick={() => (setDraft(todo.title), setEditing(true))}>
        Sửa
      </button>
      <button type="button" onClick={() => onRemove(todo.id)}>
        Xoá
      </button>
    </li>
  );
}
