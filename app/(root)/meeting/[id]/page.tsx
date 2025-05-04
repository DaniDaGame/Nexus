import MeetingClient from "@/components/MeetingClient";

export default async function Page({ params }: { params: { id: string } }) {
  return <MeetingClient id={params.id} />;
}
