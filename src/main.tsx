import { render } from "preact";
import { App } from "./app.tsx";
import "./index.css";
import "./infrastructure/i18n";

render(<App />, document.getElementById("app")!);
