import React from "react";
import { GenerateTokenForm } from "@/components/leads/GenerateTokenForm";

export default function GenerateTokenPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-[#011550]">Generate Token</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        Enter your client's details. You get a token instantly and TijaraOne is notified.
      </p>
      <GenerateTokenForm />
    </div>
  );
}
