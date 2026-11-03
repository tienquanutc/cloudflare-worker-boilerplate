import { useEffect, useRef, useState, type FormEvent } from "react";
import type { StoredFile } from "../../shared/types";
import { api } from "../api";
import { ErrorText, useAction } from "../use-action";

export function FilesPage() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { error, run } = useAction();

  const reload = () => run(async () => setFiles(await api.files.list()));
  useEffect(() => {
    reload();
  }, []);

  function upload(event: FormEvent) {
    event.preventDefault();
    const file = input.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    run(async () => {
      await api.files.upload(file);
      input.current!.value = "";
      await reload();
    }).finally(() => setUploading(false));
  }

  return (
    <>
      <h1>R2</h1>
      <p className="muted">Lưu file như S3, không tốn phí băng thông tải về. Tối đa 10 MB mỗi file trong demo.</p>

      <form onSubmit={upload}>
        <input ref={input} type="file" required />
        <button type="submit" disabled={uploading}>
          {uploading ? "Đang tải lên…" : "Upload"}
        </button>
      </form>

      <ErrorText error={error} />

      <ul>
        {files.map((file) => (
          <li key={file.name}>
            <a href={api.files.url(file.name)} target="_blank" rel="noreferrer" className="grow">
              {file.name}
            </a>
            <span className="muted">
              {formatSize(file.size)} · {file.contentType}
            </span>
            <button type="button" onClick={() => run(async () => (await api.files.remove(file.name), await reload()))}>
              Xoá
            </button>
          </li>
        ))}
      </ul>
      {files.length === 0 && <p className="muted">Chưa có file nào.</p>}
    </>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
