import { Switch, Route, Router as WouterRouter } from "wouter";
import PomodoroPage from "@/pages/PomodoroPage";
import StatsPage from "@/pages/StatsPage";

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={PomodoroPage} />
        <Route path="/stats" component={StatsPage} />
        <Route component={PomodoroPage} />
      </Switch>
    </WouterRouter>
  );
}

export default App;
