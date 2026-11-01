import SidebarContent from "./SidebarContent.jsx";

const Sidebar = () => {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-sunken/60 px-4 py-6 md:flex">
      <SidebarContent />
    </aside>
  );
};

export default Sidebar;
