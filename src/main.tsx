import { render } from "preact";
import { App } from "./app.tsx";
import "./index.css";
import "@/infrastructure/i18n"; // Import de la configuration i18n
import { persistStorage } from "./core/db/db";

// Request persistent storage
persistStorage();

render(<App />, document.getElementById("app")!);
