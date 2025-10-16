"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import StyledComponentsRegistry from "@/lib/antd-registry";
import { ConfigProvider } from "antd";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StyledComponentsRegistry>
      <ConfigProvider
        theme={{
          token: {
            fontFamily:
              "var(--font-poppins), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          },
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </ConfigProvider>
    </StyledComponentsRegistry>
  );
}

export default Providers;
