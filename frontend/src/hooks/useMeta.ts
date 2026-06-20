import { useEffect, useState } from "react";
import { getMeta } from "../api/client";
import type { Meta } from "../types";

export function useMeta() {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    getMeta().then(setMeta).catch(() => setMeta(null));
  }, []);
  return meta;
}
