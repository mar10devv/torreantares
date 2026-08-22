import { Plus } from "lucide-react";

interface AddUserCardProps {
  onClick: () => void;
}

export default function AddUserCard({ onClick }: AddUserCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex h-52 w-44 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-white/15 bg-white/[0.03] px-4 text-center transition-[transform,background-color,border-color] duration-200 ease-out will-change-transform hover:scale-105 hover:border-blue-500/50 hover:bg-white/[0.06]"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-gray-400 transition-colors duration-200 group-hover:border-blue-500/40 group-hover:bg-blue-500/10 group-hover:text-blue-300">
        <Plus size={28} />
      </div>

      <span className="text-sm font-medium text-gray-400 transition-colors duration-200 group-hover:text-white">
        Agregar usuario
      </span>
    </button>
  );
}