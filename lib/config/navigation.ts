export type NavigationItem = {
  label: string;
  href: string;
};

// The everyday outreach screens. Everything else lives behind Admin Tools.
export const primaryNavigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/school-outreach", label: "School Outreach" },
  { href: "/university-outreach", label: "University Outreach" },
  { href: "/research/opportunities", label: "Opportunities to Review" },
  { href: "/pipeline", label: "Active Opportunities" },
  { href: "/tasks", label: "Tasks" }
];

export const adminToolsLink: NavigationItem = {
  href: "/admin-tools",
  label: "Admin Tools"
};
