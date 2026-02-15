"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import StyledComponentsRegistry from "@/lib/antd-registry";
import { ConfigProvider, App } from "antd";

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
        <App>
          <AuthProvider>{children}</AuthProvider>
        </App>
      </ConfigProvider>
    </StyledComponentsRegistry>
  );
}

export default Providers;
