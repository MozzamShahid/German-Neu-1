import type { Metadata } from "next";
import { Schreiben } from "@/components/MockLoaders";
import { MockPage } from "@/components/mock";

export const metadata: Metadata = { title: "Schreiben – A1 mock test" };

export default function Page() {
  return (
    <MockPage title="Schreiben" subtitle="A1 mock test · Formular + E-Mail · AI check">
      <Schreiben />
    </MockPage>
  );
}
