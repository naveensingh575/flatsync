export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6 select-none">
      <div className="flex flex-col items-center gap-5 max-w-sm text-center">
        {/* Animated Cart Logo with Glow */}
        <div className="relative">
          <div className="absolute -inset-4 bg-emerald-500/20 dark:bg-emerald-500/25 rounded-full blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-500/25 flex items-center justify-center transform transition-transform hover:scale-105">
            <span className="text-4xl animate-bounce">🛒</span>
          </div>
        </div>

        {/* Welcome Text */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            Welcome to <span className="text-emerald-600 dark:text-emerald-400">GrocerySync</span>
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Syncing shared grocery list & quick delivery...
          </p>
        </div>

        {/* Sleek Animated Progress Indicator */}
        <div className="w-48 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
