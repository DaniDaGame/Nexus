import MeetingClient from '@/components/MeetingClient';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <MeetingClient id={resolvedParams.id} />;
}
