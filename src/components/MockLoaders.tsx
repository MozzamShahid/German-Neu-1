"use client";

import dynamic from "next/dynamic";

// the mock-test sections read the saved name from localStorage, so render them on the client only
const loading = () => <div className="p-10 text-center text-slate-400">Loading…</div>;

export const Hoeren = dynamic(() => import("./HoerenTest"), { ssr: false, loading });
export const Lesen = dynamic(() => import("./LesenTest"), { ssr: false, loading });
export const Schreiben = dynamic(() => import("./SchreibenTest"), { ssr: false, loading });
export const Sprechen = dynamic(() => import("./SprechenTest"), { ssr: false, loading });
