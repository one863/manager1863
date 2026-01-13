import { render } from 'preact'
import { App } from './app.tsx'
import './index.css'
import './i18n'; // Import de la configuration i18n

render(<App />, document.getElementById('app')!)
