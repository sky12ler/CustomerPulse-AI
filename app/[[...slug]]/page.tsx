import { Dashboard } from "@/components/dashboard";

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = ["overview"] } = await params;
  return <Dashboard initialPage={slug[0] || "overview"} />;
}
