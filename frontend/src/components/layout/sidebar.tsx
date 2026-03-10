"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  FileText,
  Zap,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

const NAV_ITEMS = [
  {
    label: "Chat",
    href: "/chat",
    icon: MessageSquare,
    description: "AI conversations",
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
    description: "Knowledge base",
  },
  {
    label: "Skills",
    href: "/skills",
    icon: Zap,
    description: "Agent skills",
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() ?? "?";

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border/50 bg-sidebar transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {/* Logo area */}
      <div className="flex h-14 items-center gap-2.5 px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-foreground animate-in fade-in slide-in-from-left-2 duration-200">
            AgentChat
          </span>
        )}
      </div>

      <Separator className="opacity-50" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary animate-in fade-in slide-in-from-left-1 duration-200" />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!collapsed && (
                  <span className="animate-in fade-in slide-in-from-left-2 duration-200">
                    {item.label}
                  </span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger
                    render={linkContent}
                  />
                  <TooltipContent side="right" className="text-xs">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-muted-foreground">{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <React.Fragment key={item.href}>{linkContent}</React.Fragment>;
          })}
        </nav>
      </ScrollArea>

      {/* Bottom controls */}
      <div className="mt-auto border-t border-border/50 px-2 py-2">
        {/* User menu */}
        {!loading && user && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                collapsed && "justify-center px-0"
              )}
            >
              <Avatar size="sm">
                <AvatarFallback className="text-[10px]">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 truncate text-left animate-in fade-in slide-in-from-left-2 duration-200">
                  <p className="truncate text-xs font-medium text-foreground">
                    {user.user_metadata?.full_name || "User"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={collapsed ? "right" : "top"}
              align="start"
              sideOffset={8}
            >
              <div className="px-1.5 py-1.5">
                <p className="text-sm font-medium">
                  {user.user_metadata?.full_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div
          className={cn(
            "flex items-center mt-1",
            collapsed ? "flex-col gap-1" : "justify-between"
          )}
        >
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              onClick={onToggle}
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
              <span className="sr-only">
                {collapsed ? "Expand sidebar" : "Collapse sidebar"}
              </span>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "top"}>
              {collapsed ? "Expand" : "Collapse"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
