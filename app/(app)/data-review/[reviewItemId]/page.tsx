import { redirect } from "next/navigation";

type ReviewItemPageProps = {
  params: Promise<{ reviewItemId: string }>;
};

export default async function ReviewItemPage({ params }: ReviewItemPageProps) {
  const { reviewItemId } = await params;

  redirect(`/data-review?review=${reviewItemId}`);
}
