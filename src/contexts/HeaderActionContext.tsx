import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface HeaderActionContextValue {
  action: ReactNode;
  setAction: (node: ReactNode) => void;
}

const HeaderActionContext = createContext<HeaderActionContextValue>({
  action: null,
  setAction: () => {},
});

export function HeaderActionProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<ReactNode>(null);
  const setActionStable = useCallback((node: ReactNode) => setAction(node), []);
  const value = useMemo(() => ({ action, setAction: setActionStable }), [action, setActionStable]);
  return <HeaderActionContext.Provider value={value}>{children}</HeaderActionContext.Provider>;
}

export function useHeaderAction(): HeaderActionContextValue {
  return useContext(HeaderActionContext);
}

/** Pasang elemen aksi di sisi kanan header (dipanggil dari dalam halaman) */
export function useSetHeaderAction(action: ReactNode) {
  const { setAction } = useContext(HeaderActionContext);
  useEffect(() => {
    setAction(action);
    return () => setAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, setAction]);
}