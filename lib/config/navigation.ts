export type NavigationItem = {
  label: string;
  href?: string;
  status?: "coming-soon" | "working";
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Working now",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/school-outreach", label: "School Outreach" },
      { href: "/research/opportunities", label: "Opportunities to Review" },
      { href: "/pipeline", label: "Active Opportunities" },
      { href: "/tasks", label: "Tasks" },
      { href: "/data-review", label: "Data Issues to Review" },
      { href: "/organizations", label: "Organizations" },
      { href: "/contacts", label: "Contacts" },
      { href: "/events", label: "Events" },
      { href: "/activity", label: "Activity" }
    ]
  },
  {
    label: "Coming soon",
    items: [
      { label: "Proposals", status: "coming-soon" },
      { label: "Templates", status: "coming-soon" },
      { label: "Settings", status: "coming-soon" }
    ]
  }
];
