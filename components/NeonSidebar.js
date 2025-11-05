export default function NeonSidebar() {
  return (
    <aside className="hidden md:flex md:flex-col gap-3 w-16 pt-6 items-center border-r border-white/15 glass-card">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500" />
      <div className="w-10 h-10 rounded-xl glass-card border" />
      <div className="w-10 h-10 rounded-xl glass-card border" />
      <div className="w-10 h-10 rounded-xl glass-card border" />
    </aside>
  );
}
