import { useCallback, useState } from "react";

/** Chạy một thao tác async, giữ thông báo lỗi để hiện trên trang. */
export function useAction() {
  const [error, setError] = useState<string>();

  const run = useCallback(async (action: () => Promise<void>) => {
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  return { error, run };
}

export function ErrorText({ error }: { error?: string }) {
  return error ? <p className="error">Lỗi: {error}</p> : null;
}
