import { redirect } from "next/navigation";

export default function TokensRedirectPage({
  searchParams,
}: {
  searchParams: { q?: string; stage?: string; serviceType?: string; sort?: string; page?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.stage) params.set("stage", searchParams.stage);
  if (searchParams.serviceType) params.set("serviceType", searchParams.serviceType);
  if (searchParams.sort) params.set("sort", searchParams.sort);
  if (searchParams.page) params.set("page", searchParams.page);
  const qs = params.toString();
  redirect(qs ? `/dashboard/clients?${qs}` : "/dashboard/clients");
}
