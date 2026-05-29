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
            colorPrimary: '#4f46e5', // Brand 600
            colorInfo: '#6366f1',
            colorSuccess: '#10b981',
            colorWarning: '#f59e0b',
            colorError: '#ef4444',
            borderRadius: 8,
            wireframe: false,
            colorBgContainer: '#ffffff',
            colorBgLayout: '#f8fafc',
          },
          components: {
            Button: {
              controlHeight: 40,
              borderRadius: 8,
              fontWeight: 500,
            },
            Card: {
              borderRadius: 12,
              boxShadowTertiary: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            },
            Input: {
              controlHeight: 40,
              borderRadius: 8,
            },
            Select: {
              controlHeight: 40,
              borderRadius: 8,
            }
          }
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
