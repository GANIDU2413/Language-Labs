export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Admin auth guard + admin sidebar will be added here
  return <main className="min-h-screen">{children}</main>
}
