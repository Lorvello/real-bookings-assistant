
import { TranslationDemo } from "@/components/TranslationDemo";

export const MultiLanguageCard = () => {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Translation Demo Interface */}
      <TranslationDemo />
      
      {/* Globe icon and background accent elements */}
      <div className="absolute bottom-4 left-4 text-emerald-400/30 text-2xl">🌍</div>
      <div className="absolute bottom-4 right-4 w-3 h-3 bg-emerald-500/40 rounded-full" />
    </div>
  );
};
