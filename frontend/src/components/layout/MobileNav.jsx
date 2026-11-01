import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import { Drawer } from "../ui/index.js";
import SidebarContent from "./SidebarContent.jsx";

// Tailwind's `md` breakpoint. At this width and above, the normal sidebar takes over.
const DESKTOP_QUERY = "(min-width: 48rem)";

const MobileNav = () => {
  const location = useLocation();
  // We remember which page the menu was opened on. If the page changes (Back button,
  // a link), the menu counts as closed, with no extra effect needed.
  const [openedOn, setOpenedOn] = useState(null);
  const open = openedOn === location.key;

  const close = () => {
    setOpenedOn(null);
  };

  // Growing the window to desktop size closes the menu, so the page doesn't stay locked.
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);

    const handleChange = (event) => {
      if (event.matches) {
        setOpenedOn(null);
      }
    };

    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => {
          setOpenedOn(location.key);
        }}
        className="grid size-9 place-items-center rounded-control text-ink-soft transition-colors hover:bg-sunken md:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <Drawer open={open} onClose={close} label="Main menu">
        <button
          type="button"
          aria-label="Close menu"
          onClick={close}
          className="absolute top-5 right-3 grid size-9 place-items-center rounded-control text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <SidebarContent onNavigate={close} />
      </Drawer>
    </>
  );
};

export default MobileNav;
