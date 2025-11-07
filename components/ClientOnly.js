import { useEffect, useState } from "react";

export default function ClientOnly({ children, placeholder = null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) {
    // Render a stable placeholder during SSR and before hydration completes
    return placeholder ?? <div suppressHydrationWarning />;
  }
  return children;
}