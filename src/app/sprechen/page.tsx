import type { Metadata } from "next";
import { Sprechen } from "@/components/MockLoaders";
import { MockPage } from "@/components/mock";

export const metadata: Metadata = { title: "Sprechen – A1 mock test" };

export default function Page() {
  return (
    <MockPage title="Sprechen" subtitle="A1 mock test · speak with the microphone · AI check">
      <Sprechen />
    </MockPage>
  );
}
