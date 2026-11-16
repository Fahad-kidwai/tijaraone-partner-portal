import { redirect } from "next/navigation";

export default function TokenDetailRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/clients/${params.id}`);
}
