export interface TopUtilityBarConfig {
  systemLabel: string;
  subLabel: string;
  helpline: string;
  accessibility: string[];
  loginUrl: string;
}

export interface HeroConfig {
  badge: string;
  headline: string;
  description: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta: {
    label: string;
    href: string;
  };
}

export interface StatItem {
  iconName: string;
  label: string;
  value: string;
  color?: string;
}

export interface GovernanceModuleCard {
  id: number;
  iconName: string;
  iconBg: string;
  numberPrefix: string;
  title: string;
  description: string;
  linkText: string;
  linkHref: string;
}

export interface HomepageContent {
  topBar: TopUtilityBarConfig;
  navHeader: {
    title: string;
    subtitle: string;
    portalButtonText: string;
    portalButtonHref: string;
  };
  hero: HeroConfig;
  stats: StatItem[];
  modulesHeading: string;
  modules: GovernanceModuleCard[];
}

export const homepageContent: HomepageContent = {
  topBar: {
    systemLabel: "GOVERNMENT CIVIC OPERATING SYSTEM",
    subLabel: "Public Grievance, SLA & Governance Portal",
    helpline: "Toll-Free Helpline: 1800-11-2026",
    accessibility: ["A-", "A", "A+"],
    loginUrl: "/login",
  },
  navHeader: {
    title: "Community Redressal Planner",
    subtitle: "Ministry of Urban Development & Municipal Governance",
    portalButtonText: "Sign In",
    portalButtonHref: "/login",
  },
  hero: {
    badge: "Official Governance Operating System",
    headline: "Automated AI Grievance Redressal & Civic SLA Management",
    description:
      "Welcome to the centralized Municipal Civic Portal. Our AI-driven engine automatically classifies complaints, extracts location entities, merges duplicate issues using Sentence Transformers within 500m geo-radii, and enforces strict department SLA timelines.",
    primaryCta: {
      label: "Submit Grievance",
      href: "/complaints/new",
    },
    secondaryCta: {
      label: "Officer GIS Portal",
      href: "/map",
    },
  },
  stats: [
    {
      iconName: "Layers",
      label: "TOTAL GRIEVANCES",
      value: "4",
      color: "text-blue-600",
    },
    {
      iconName: "Zap",
      label: "DUPLICATES GROUPED",
      value: "1",
      color: "text-purple-600",
    },
    {
      iconName: "Clock",
      label: "SLA COMPLIANCE",
      value: "87.5%",
      color: "text-emerald-600",
    },
    {
      iconName: "CheckCircle",
      label: "GRIEVANCES RESOLVED",
      value: "1",
      color: "text-teal-600",
    },
  ],
  modulesHeading: "Civic Governance Modules",
  modules: [
    {
      id: 1,
      iconName: "FileText",
      iconBg: "bg-blue-900 text-white",
      numberPrefix: "1.",
      title: "AI Grievance Intake",
      description:
        "Submit complaints using multimodal input (text, photo evidence, or simulated voice intake). Automatic department categorization & urgency scoring.",
      linkText: "Launch Intake Form",
      linkHref: "/complaints/new",
    },
    {
      id: 2,
      iconName: "Users",
      iconBg: "bg-emerald-900 text-white",
      numberPrefix: "2.",
      title: "Citizen Tracker",
      description:
        "Track complaint resolution status in real-time, view SLA deadlines, read officer audit logs, and check master duplicate ticket links.",
      linkText: "View Citizen Portal",
      linkHref: "/dashboard/citizen",
    },
    {
      id: 3,
      iconName: "MapPin",
      iconBg: "bg-slate-900 text-amber-400",
      numberPrefix: "3.",
      title: "Officer GIS Queue",
      description:
        "Interactive Leaflet GIS map with ward spatial pins. Prioritizes active issues by SLA breach risk and duplicate impact score.",
      linkText: "Open Officer Map",
      linkHref: "/map",
    },
    {
      id: 4,
      iconName: "BarChart2",
      iconBg: "bg-blue-950 text-blue-400",
      numberPrefix: "4.",
      title: "Executive Analytics",
      description:
        "Geospatial heatmaps, SLA violation alerts, category distributions, and duplicate resolution efficiency analytics.",
      linkText: "Open Analytics",
      linkHref: "/analytics",
    },
  ],
};
