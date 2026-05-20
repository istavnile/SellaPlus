export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-gray-100 flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {children}
    </div>
  );
}
