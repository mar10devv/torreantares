import { Plus } from "lucide-react";

interface AddUserCardProps {
  onClick: () => void;
}

export default function AddUserCard({ onClick }: AddUserCardProps) {
  return (
    <button
      onClick={onClick}
      className="
        group
        flex h-48 w-44 flex-col items-center justify-center gap-3
        rounded-3xl
        border border-dashed border-white/15
        bg-white/[0.04]
        backdrop-blur-2xl
        transition-all
        duration-300
        hover:scale-105
        hover:border-blue-500/40
        hover:bg-white/[0.08]
        active:scale-95
      "
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-gray-300 transition group-hover:border-blue-500/40 group-hover:text-white">
        <Plus size={26} strokeWidth={2} />
      </div>
      <span className="text-sm font-medium text-gray-400 transition group-hover:text-gray-200">
        Agregar usuario
      </span>
    </button>
  );
}