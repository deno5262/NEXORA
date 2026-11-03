export default function RichText({ text }: { text: string }) {
  const parts = text.split(/([@#][\w\u0980-\u09FF]+)/g)
  return <>{parts.map((p, i) => p.startsWith('@') ? <span key={i} className="font-semibold text-accent">{p}</span> : p.startsWith('#') ? <span key={i} className="text-accent">{p}</span> : p)}</>
}
