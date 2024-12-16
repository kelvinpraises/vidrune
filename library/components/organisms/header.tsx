import { MainNav } from "@/components/molecules/nav-main";
import { UserNav } from "@/components/molecules/nav-user";

const Header = ({ className }: { className?: string }) => {
  return (
    <header>
      <div className="flex items-center p-4">
        <div className="flex items-center">
          <p className="text-2xl">🎥ᚱ</p>
        </div>
        <MainNav className="mx-6" />
        <div className="ml-auto flex items-center space-x-4">
          <UserNav />
        </div>
      </div>
    </header>
  );
};

export default Header;
