const CoreLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex w-screen h-screen font-jetbrains-mono">
      {children}
    </main>
  );
};

export default CoreLayout;
