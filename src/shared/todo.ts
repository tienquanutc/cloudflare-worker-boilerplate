/** Một todo, dạng JSON mà API trả về (dùng chung cho Worker và React). */
export type Todo = {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
};

/** Body của POST /api/todos. */
export type CreateTodo = { title: string };

/** Body của PATCH /api/todos/:id — chỉ gửi trường muốn sửa. */
export type UpdateTodo = { title?: string; done?: boolean };
