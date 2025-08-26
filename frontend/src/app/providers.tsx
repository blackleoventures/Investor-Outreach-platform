"use client";

import { Provider as ReduxProvider } from "react-redux";
import { AuthProvider } from "../legacy_src/Context/AuthContext.jsx";
import store from "../legacy_src/store/store";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ReduxProvider store={store}>{children}</ReduxProvider>
    </AuthProvider>
  );
}

