import type { Metadata } from "next";
import { Hoeren } from "@/components/MockLoaders";
import { MockPage } from "@/components/mock";

export const metadata: Metadata = { title: "Hören – A1 mock test" };

export default function Page() {
  return (
    <MockPage title="Hören" subtitle="A1 mock test · Teil 1–3 · 15 Aufgaben · German voices">
      <Hoeren />
    </MockPage>
  );
}
