"use client";

import dynamic from "next/dynamic";

// reads the saved name from localStorage, so render on the client only
const HoerenTest = dynamic(() => import("./HoerenTest"), {
  ssr: false,
  loading: () => <div className="p-10 text-center text-slate-400">Loading…</div>,
});

export default HoerenTest;
