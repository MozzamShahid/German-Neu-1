"use client";

import dynamic from "next/dynamic";

// The quiz app keeps settings in localStorage, so render it on the client only.
const App = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => <div className="p-10 text-center text-slate-400">Loading…</div>,
});

export default App;
