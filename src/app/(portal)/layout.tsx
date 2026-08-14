"use client";

import { ReactNode, useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import ExcelEditor from "@/components/ExcelEditor";
import DocxViewer from "@/components/DocxViewer";
import PdfViewer from "@/components/PdfViewer";
import { getSafeFileUrl } from "@/lib/file-helper";
import {
  Sun,
  LayoutDashboard,
  Megaphone,
  Calendar,
  FolderClosed,
  Settings,
  User,
  Users,
  CheckSquare,
  DollarSign,
  Heart,
  Wrench,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Menu,
  X,
  PlayCircle,
  MessageSquare,
  FileText
} from "lucide-react";

export default function PortalLayout({ children }: { children: ReactNode }) {
  const { 
    user, 
    setUser, 
    loadingUser, 
    setLoadingUser, 
    sidebarCollapsed, 
    toggleSidebar,
    activeExcelFile,
    activeDocxFile,
    activePdfFile,
    setActiveExcelFile,
    setActiveDocxFile,
    setActivePdfFile
  } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Hydrate user from session on mount
  useEffect(() => {
    if (user) {
      // Already loaded — mark loading done
      setLoadingUser(false);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 6000); // 6-second timeout — prevent infinite loading spinner

    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me", { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Not authenticated — redirect to login
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      } finally {
        clearTimeout(timeoutId);
        setLoadingUser(false);
      }
    }
    fetchMe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (href.startsWith("/") && !href.includes("/api/uploads") && !href.includes("/uploads/")) {
        return;
      }

      const urlPath = href.toLowerCase().split("?")[0];
      const isExcel = urlPath.endsWith(".xlsx") || urlPath.endsWith(".xls") || urlPath.endsWith(".csv");
      const isDocx = urlPath.endsWith(".docx") || urlPath.endsWith(".doc");
      const isPdf = urlPath.endsWith(".pdf");

      if (isExcel || isDocx || isPdf) {
        if (anchor.hasAttribute("download")) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();

        let fileName = anchor.getAttribute("download") || anchor.innerText.trim();
        if (!fileName || fileName === "Download") {
          const parts = href.split("/");
          fileName = decodeURIComponent(parts[parts.length - 1]);
        }

        const fileRef = {
          id: -1,
          name: fileName,
          fileUrl: href
        };

        if (isExcel) {
          setActiveExcelFile(fileRef);
        } else if (isDocx) {
          setActiveDocxFile(fileRef);
        } else if (isPdf) {
          setActivePdfFile(fileRef);
        }
      }
    };

    document.addEventListener("click", handleGlobalClick, true);
    return () => {
      document.removeEventListener("click", handleGlobalClick, true);
    };
  }, [setActiveExcelFile, setActiveDocxFile, setActivePdfFile]);

  // Load notifications dynamically from the API
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    }
    if (user) {
      loadNotifications();
      // Poll every 60 seconds
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        setUser(null);
        router.push("/login");
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard?search=${encodeURIComponent(searchQuery)}`);
    }
  }

  // Sidebar links with roles check
  const navigationSections = [
    {
      title: null,
      links: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["all"] }
      ]
    },
    {
      title: "Management",
      links: [
        { label: "Staff Management", href: "/users", icon: Users, roles: ["Admin", "HR"] },
        { label: "Performance", href: "/performance", icon: TrendingUp, roles: ["Admin"] },
        { label: "File Manager", href: "/files", icon: FolderClosed, roles: ["Admin", "HR", "Accountant", "Sales & Marketing Department"] }
      ]
    },
    {
      title: "Technical / Field Staff Department",
      links: [
        { label: "Tasks", href: "/tasks", icon: CheckSquare, roles: ["all"] },
        { label: "Complaints", href: "/complaints", icon: MessageSquare, roles: ["all"] },
        { label: "Feedback", href: "/feedback-manager", icon: MessageSquare, roles: ["all"] }
      ]
    },
    {
      title: "Sales & Marketing Department",
      links: [
        { label: "Sales", href: "/sales", icon: Sun, roles: ["Admin", "Sales & Marketing Department"] },
        { label: "CRM", href: "/crm", icon: TrendingUp, roles: ["Admin", "Sales & Marketing Department"] }
      ]
    },
    {
      title: "Admin & Accounts Department",
      links: [
        { label: "HR", href: "/hr", icon: Users, roles: ["Admin", "HR"] },
        { label: "Accounts", href: "/accounts", icon: DollarSign, roles: ["Admin", "Accountant"] }
      ]
    },
    {
      title: null,
      links: [
        { label: "Announcements", href: "/announcements", icon: Megaphone, roles: ["Admin", "HR", "Accountant", "Sales & Marketing Department"] }
      ]
    },
    {
      title: null,
      links: [
        { label: "Settings", href: "/settings", icon: Settings, roles: ["all"] },
        { label: "Profile", href: "/profile", icon: User, roles: ["all"] }
      ]
    }
  ];

  const visibleSections = navigationSections.map(section => {
    const visibleLinks = section.links.filter((link) => {
      if (link.roles.includes("all")) return true;
      if (!user) return false;
      const userRoles = (user.role || "").split(",").map(r => r.trim().toLowerCase());
      
      // Admins have access to everything visible
      if (userRoles.some(r => ["admin", "super admin", "management"].includes(r))) {
        return true;
      }

      return link.roles.some((role) => {
        const r = role.toLowerCase();
        return userRoles.some(uRole => {
          if (r === uRole) return true;
          if (r === "accounts" && uRole === "accountant") return true;
          if (r === "sales & marketing" && uRole === "sales & marketing department") return true;
          return false;
        });
      });
    });
    return { ...section, links: visibleLinks };
  }).filter(section => section.links.length > 0);

  // Show full-page spinner while user session is being verified
  if (loadingUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Loading portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar for Desktop */}
      <aside
        className={`hidden md:flex flex-col bg-zinc-900 border-r border-zinc-800 transition-all duration-300 relative z-20 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Header/Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-800 shrink-0">
          <img src="/logo.png" alt="Askari Logo" className="h-8 w-8 rounded-full object-cover border border-amber-500/30" />
          {!sidebarCollapsed && (
            <span className="font-extrabold text-sm tracking-wider uppercase bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Askari Solar Energy
            </span>
          )}
        </div>

        {/* Collapsible toggle button */}
        <button
          onClick={toggleSidebar}
          className="absolute top-6 -right-3 h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 cursor-pointer hidden md:flex"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-zinc-400" />
          )}
        </button>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
          {visibleSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && !sidebarCollapsed && (
                <div className="px-3 py-1 text-[10px] font-bold text-zinc-550 uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              {section.links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href.split("?")[0] || (link.href !== "/dashboard" && pathname.startsWith(link.href.split("?")[0]));
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                      isActive
                        ? "bg-amber-500 text-zinc-950 font-semibold"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!sidebarCollapsed && <span>{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Footer Profile */}
        {user && (
          <div className="p-4 border-t border-zinc-800 shrink-0 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-amber-500 border border-zinc-700">
                {user.name.charAt(0)}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-zinc-200">{user.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{user.role}</p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="mt-2 flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-800/50 text-red-400 hover:bg-red-950/20 hover:text-red-300 border border-red-500/10 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in">
          <div className="w-64 bg-zinc-900 h-full flex flex-col border-r border-zinc-800 animate-slide-in">
            <div className="flex items-center justify-between px-4 py-5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Askari Logo" className="h-8 w-8 rounded-full object-cover border border-amber-500/30" />
                <span className="font-extrabold text-sm tracking-wider uppercase text-amber-500">
                  Askari Solar Energy
                </span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
              {visibleSections.map((section, idx) => (
                <div key={idx} className="space-y-1">
                  {section.title && (
                    <div className="px-3 py-1 text-[10px] font-bold text-zinc-550 uppercase tracking-wider">
                      {section.title}
                    </div>
                  )}
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href.split("?")[0] || (link.href !== "/dashboard" && pathname.startsWith(link.href.split("?")[0]));
                    return (
                      <Link
                        key={link.label}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                          isActive
                            ? "bg-amber-500 text-zinc-950 font-semibold"
                            : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="p-4 border-t border-zinc-800">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-800 text-red-400 font-semibold cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div className="flex flex-col flex-1 overflow-hidden relative z-10">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900/60 backdrop-blur px-4 md:px-6 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            {/* Mobile Menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-zinc-400 hover:text-white cursor-pointer"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Breadcrumbs */}
            <div className="text-sm font-semibold text-zinc-400 flex items-center gap-1.5 capitalize">
              <span className="text-zinc-200">Askari</span>
              <span>/</span>
              <span className="text-amber-500 font-bold">
                {pathname.split("/")[1]?.replace("-", " ") || "Dashboard"}
              </span>
            </div>
          </div>

          {/* Search, Notifications & Actions */}
          <div className="flex items-center gap-4">
            {/* Global Search Bar */}
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex relative">
              <input
                type="text"
                placeholder="Global Search (Files, Leads, Staff...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 glass-input rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:w-80 transition-all duration-300"
              />
              <Search className="absolute left-3 top-2 h-4 w-4 text-zinc-500" />
            </form>

            {/* Notification Center */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <Bell className="h-5 w-5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 glass-panel rounded-xl shadow-2xl p-4 z-50 text-xs border border-zinc-800 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 font-bold text-zinc-300">
                    <span>Notifications</span>
                    <button
                      onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                      className="text-amber-500 hover:text-amber-400 cursor-pointer"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-2 rounded-lg ${notif.read ? "bg-zinc-900/40" : "bg-amber-500/5 border border-amber-500/10"}`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-zinc-200">{notif.title}</span>
                            <span className="text-zinc-500 font-light">{notif.time}</span>
                          </div>
                          <p className="text-zinc-400 mt-1">{notif.content}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-zinc-500 py-4 text-center">No notifications</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions (Create Quotation / Check Attendance shortcut) */}
            <div className="flex gap-2">
              <Link
                href="/tasks"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 border border-zinc-700 transition"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Today's Work</span>
              </Link>
              <Link
                href="/hr"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-zinc-950 transition"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Attendance</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-zinc-950 relative">
          {children}
        </main>
      </div>

      {activeExcelFile && (
        <ExcelEditor
          fileId={activeExcelFile.id}
          fileUrl={getSafeFileUrl(activeExcelFile.fileUrl)}
          fileName={activeExcelFile.name}
          onClose={() => setActiveExcelFile(null)}
          onSaveSuccess={() => {
            window.dispatchEvent(new CustomEvent("file-saved"));
          }}
        />
      )}

      {activeDocxFile && (
        <DocxViewer
          fileUrl={activeDocxFile.fileUrl}
          fileName={activeDocxFile.name}
          onClose={() => setActiveDocxFile(null)}
        />
      )}

      {activePdfFile && (
        <PdfViewer
          fileUrl={activePdfFile.fileUrl}
          fileName={activePdfFile.name}
          onClose={() => setActivePdfFile(null)}
        />
      )}
    </div>
  );
}
