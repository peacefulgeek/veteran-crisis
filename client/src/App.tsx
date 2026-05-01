import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Articles from "./pages/Articles";
import ArticleDetail from "./pages/ArticleDetail";
import About from "./pages/About";
import Recommended from "./pages/Recommended";
import Privacy from "./pages/Privacy";
import Disclosures from "./pages/Disclosures";
import Contact from "./pages/Contact";
import Author from "./pages/Author";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/articles" component={Articles} />
      <Route path="/articles/:slug" component={ArticleDetail} />
      <Route path="/about" component={About} />
      <Route path="/recommended" component={Recommended} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/disclosures" component={Disclosures} />
      <Route path="/contact" component={Contact} />
      <Route path="/author/the-oracle-lover" component={Author} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
