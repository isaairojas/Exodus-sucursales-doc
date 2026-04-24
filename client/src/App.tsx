// ============================================================
// APYMSA — App Root
// Design: Enterprise Precision — light theme (desktop), dark theme (mobile)
// Routes:
//   /                → Home de módulos
//   /logistica       → Módulo de Logística
//   /mobile          → MobileAuth
//   /mobile/menu     → MobileMenu
//   /mobile/revision → MobileSelect (order selection)
//   /mobile/revisar  → MobileRevision (blind review)
//   /mobile/resumen  → MobileSummary (review summary)
// ============================================================
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import Home from "./pages/Home";
import ModulesHome from "./pages/ModulesHome";
import MobileAuth from "./pages/MobileAuth";
import MobileMenu from "./pages/MobileMenu";
import MobileSelect from "./pages/MobileSelect";
import MobileRevision from "./pages/MobileRevision";
import MobileSummary from "./pages/MobileSummary";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';

function Router() {
  return (
    <WouterRouter base={BASE}>
      <Switch>
        <Route path={"/"} component={ModulesHome} />
        <Route path={"/logistica"} component={Home} />
        <Route path={"/mobile"} component={MobileAuth} />
        <Route path={"/mobile/menu"} component={MobileMenu} />
        <Route path={"/mobile/revision"} component={MobileSelect} />
        <Route path={"/mobile/revisar"} component={MobileRevision} />
        <Route path={"/mobile/resumen"} component={MobileSummary} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AppProvider>
          <TooltipProvider>
            <Router />
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
