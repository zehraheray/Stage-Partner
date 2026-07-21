export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 font-sans selection:bg-blue-500/30">
      <div className="w-full max-w-md bg-neutral-900/80 border border-neutral-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Stage Partner <span className="text-blue-500">Auth</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">MasterFabric Güvenlik Portalı</p>
        </div>
        {children}
      </div>
    </div>
  );
}