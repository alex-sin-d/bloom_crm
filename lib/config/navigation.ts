export type NavigationItem = {
  href: string;
  label: string;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Work",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/research", label: "Research" },
      { href: "/pipeline", label: "Pipeline" },
      { href: "/organizations", label: "Organizations" },
      { href: "/contacts", label: "Contacts" },
      { href: "/events", label: "Events" },
      { href: "/tasks", label: "Tasks" }
    ]
  },
  {
    label: "Tools and administration",
    items: [
      { href: "/proposals", label: "Proposals" },
      { href: "/templates", label: "Templates" },
      { href: "/data-review", label: "Data Review" },
      { href: "/settings", label: "Settings" }
    ]
  }
];
