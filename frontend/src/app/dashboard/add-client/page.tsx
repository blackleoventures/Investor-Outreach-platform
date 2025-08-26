"use client";

import { useRouter } from "next/navigation";
import AddEntrpForm from "../../../legacy_src/components/form/AddEntrpForm.jsx";

export default function Page() {
  const router = useRouter();
  
  // Pass router to the legacy component if it needs navigation
  return <AddEntrpForm router={router} />;
}

