export default function Soon({ title, phase, note }: { title: string; phase: number; note?: string }) {
  return <div className="py-16 text-center"><h1 className="mb-2 text-xl font-bold">{title}</h1><p className="text-mute">{note ?? 'Not built yet.'} Planned for Phase {phase}.</p></div>
}
