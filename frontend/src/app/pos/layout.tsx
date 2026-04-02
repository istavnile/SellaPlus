export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100">{children}</div>
  );
}
