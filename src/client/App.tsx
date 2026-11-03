import { Link, NavLink, Outlet, Route, Routes } from "react-router";
import { AdminPage } from "./pages/Admin";
import { CounterPage } from "./pages/Counter";
import { FilesPage } from "./pages/Files";
import { HomePage } from "./pages/Home";
import { JobsPage } from "./pages/Jobs";
import { KvPage } from "./pages/Kv";
import { ReportsPage } from "./pages/Reports";
import { TodosPage } from "./pages/Todos";

const NAV = [
  { to: "/todos", label: "D1" },
  { to: "/kv", label: "KV" },
  { to: "/files", label: "R2" },
  { to: "/jobs", label: "Queues" },
  { to: "/reports", label: "Workflows" },
  { to: "/counter", label: "Durable Objects" },
  { to: "/admin", label: "Admin" },
];

/**
 * Router phía client (React Router). Cloudflare trả index.html cho mọi đường dẫn không phải file
 * ("not_found_handling": "single-page-application"), nên mở thẳng /kv hay F5 vẫn đúng trang.
 */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="todos" element={<TodosPage />} />
        <Route path="kv" element={<KvPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="counter" element={<CounterPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function Layout() {
  return (
    <>
      <header>
        <nav>
          <Link to="/" className="brand">
            ☁️ Boilerplate
          </Link>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}

function NotFound() {
  return (
    <>
      <h1>404</h1>
      <p>
        Không có trang này. <Link to="/">Về trang chủ</Link>
      </p>
    </>
  );
}
