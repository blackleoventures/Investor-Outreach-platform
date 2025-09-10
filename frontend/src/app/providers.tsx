"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import StyledComponentsRegistry from "@/lib/antd-registry";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StyledComponentsRegistry>
      <AuthProvider>
        {children}
      </AuthProvider>
    </StyledComponentsRegistry>
  );
}

export default Providers;

