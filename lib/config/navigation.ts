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
      { href: "/pipeline", label: "Active Opportunities" }
    ]
  },
  {
    label: "Coming soon",
    items: [
      { label: "Data Issues to Review", status: "coming-soon" },
      { label: "Tasks", status: "coming-soon" },
      { label: "Organizations", status: "coming-soon" },
      { label: "Contacts", status: "coming-soon" },
      { label: "Events", status: "coming-soon" },
      { label: "Proposals", status: "coming-soon" },
      { label: "Templates", status: "coming-soon" },
      { label: "Settings", status: "coming-soon" }
    ]
  }
];
