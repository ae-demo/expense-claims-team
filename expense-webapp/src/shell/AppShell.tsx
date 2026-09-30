import type { ReactElement } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppShell as OxygenAppShell,
  ColorSchemeToggle,
  Divider,
  Footer,
  Header,
  Sidebar,
  UserMenu,
} from "@wso2/oxygen-ui";
import {
  BookOpen,
  ClipboardCheck,
  FilePlus,
  ListChecks,
  LogOut,
  Receipt,
  ShieldCheck,
} from "@wso2/oxygen-ui-icons-react";
import { APP_NAME } from "../appName";
import { Can, useAuthz, useHeldRoles } from "../authz/gates";
import { signOut } from "../authz/session";
import { SCREEN_ROUTES } from "../authz/screens";

const NAV_ICONS: Record<string, ReactElement> = {
  approvals: <ClipboardCheck />,
  myclaims: <Receipt />,
  newclaim: <FilePlus />,
  policyrules: <ShieldCheck />,
  allclaims: <ListChecks />,
  policyreadonly: <BookOpen />,
};

const NAV_SCREENS = SCREEN_ROUTES.filter((screen) => screen.sidebar);

export function AppShell(): ReactElement {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { username } = useAuthz();
  const roles = useHeldRoles();
  // Longest path first, so "/claims/new" (New Claim) wins over the shorter
  // "/claims" (My Claims) prefix it would otherwise also match.
  const activeItem = [...NAV_SCREENS]
    .sort((a, b) => b.path.length - a.path.length)
    .find((screen) => pathname === screen.path || pathname.startsWith(`${screen.path}/`))?.key;

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={username || "Signed in"} />
              <UserMenu.Header
                name={username || "Signed in"}
                email={username}
                role={roles.join(", ") || undefined}
              />
              <UserMenu.Logout icon={<LogOut />} onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>

      <OxygenAppShell.Sidebar>
        <Sidebar activeItem={activeItem} onSelect={(id) => {
          const screen = NAV_SCREENS.find((s) => s.key === id);
          if (screen) navigate(screen.path);
        }}>
          <Sidebar.Nav>
            <Sidebar.Category>
              {NAV_SCREENS.map((screen) => (
                <Can key={screen.key} op={screen.loads!}>
                  <Sidebar.Item id={screen.key} link={<Link to={screen.path} />}>
                    <Sidebar.ItemIcon>{NAV_ICONS[screen.key]}</Sidebar.ItemIcon>
                    <Sidebar.ItemLabel>{screen.label}</Sidebar.ItemLabel>
                  </Sidebar.Item>
                </Can>
              ))}
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>

      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>

      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}
