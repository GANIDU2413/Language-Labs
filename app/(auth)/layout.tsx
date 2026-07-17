export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Centered card layout for register / OTP / login
  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-light px-4 py-10">
      {children}
    </main>
  )
}
