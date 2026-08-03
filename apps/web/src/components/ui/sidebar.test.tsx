import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar, type SidebarContent } from "./sidebar";
import { Home, Settings } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

function Wrapper({ children }: { children: React.ReactNode }): React.ReactNode {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const mockItems: SidebarContent = [
  {
    title: "Main",
    items: [
      { id: "home", label: "الرئيسية", icon: Home },
      { id: "settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: "test-id",
      fullName: "Ahmed Mohamed",
      mobileNumber: "01000000000",
      role: "STUDENT",
      status: "ACTIVE",
    },
    isAuthenticated: true,
    isInitialized: true,
  });
});

describe("Sidebar", () => {
  it("renders brand text", () => {
    render(<Sidebar items={mockItems} />, { wrapper: Wrapper });
    expect(screen.getByText("MR.")).toBeInTheDocument();
    expect(screen.getByText("AL-BANNA")).toBeInTheDocument();
  });

  it("renders navigation items", () => {
    render(<Sidebar items={mockItems} />, { wrapper: Wrapper });
    expect(screen.getByText("الرئيسية")).toBeInTheDocument();
    expect(screen.getByText("الإعدادات")).toBeInTheDocument();
  });

  it("renders user first name in profile card", () => {
    render(<Sidebar items={mockItems} />, { wrapper: Wrapper });
    expect(screen.getByText("Ahmed")).toBeInTheDocument();
  });

  it("calls onProfileClick when profile card clicked", () => {
    const onProfileClick = vi.fn();
    render(<Sidebar items={mockItems} onProfileClick={onProfileClick} />, { wrapper: Wrapper });

    const profileCard = screen.getByRole("button", { name: "Ahmedطالب" });
    fireEvent.click(profileCard);
    expect(onProfileClick).toHaveBeenCalled();
  });

  it("shows no social icons when api returns empty", () => {
    render(<Sidebar items={mockItems} />, { wrapper: Wrapper });
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("calls item onClick and onClose when nav item clicked", () => {
    const onClick = vi.fn();
    const onClose = vi.fn();
    const itemsWithAction: SidebarContent = [
      {
        title: "Main",
        items: [
          { id: "home", label: "الرئيسية", icon: Home, onClick },
        ],
      },
    ];

    render(<Sidebar items={itemsWithAction} onClose={onClose} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("الرئيسية"));
    expect(onClick).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("collapses when toggle button clicked", () => {
    render(<Sidebar items={mockItems} />, { wrapper: Wrapper });
    const toggleButton = screen.getByLabelText("Collapse sidebar");
    fireEvent.click(toggleButton);
    expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
  });

  it("hides profile card when collapsed", () => {
    render(<Sidebar items={mockItems} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByLabelText("Collapse sidebar"));
    expect(screen.queryByText("Ahmed")).not.toBeInTheDocument();
  });
});
