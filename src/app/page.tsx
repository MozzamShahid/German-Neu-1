import App from "@/components/AppLoader";
import { vocab } from "@/lib/quiz";

export default function Home() {
  return (
    <main className="flex-1">
      <App chapters={vocab.chapters} />
    </main>
  );
}
