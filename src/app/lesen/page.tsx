import type { Metadata } from "next";
import { Lesen } from "@/components/MockLoaders";
import { MockPage } from "@/components/mock";

export const metadata: Metadata = { title: "Lesen – A1 mock test" };

export default function Page() {
  return (
    <MockPage title="Lesen" subtitle="A1 mock test · Teil 1–3 · 15 Aufgaben">
      <Lesen />
    </MockPage>
  );
}
