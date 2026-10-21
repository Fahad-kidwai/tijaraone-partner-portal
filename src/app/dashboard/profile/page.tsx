import React from "react";
import { requirePageRole } from "@/lib/auth/pageGuard";
import { getPartnerProfile } from "@/lib/leads/service";
import { Card } from "@/components/ui/Card";
import { ProfileForm } from "@/components/partners/ProfileForm";

export default async function ProfilePage() {
  const actor = await requirePageRole("PARTNER");
  const profile = await getPartnerProfile(actor);
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-[#011550]">Profile</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">You sign in with your email and a one-time code — there is no password.</p>
      <Card className="p-6">
        <ProfileForm profile={profile} />
      </Card>
    </div>
  );
}
