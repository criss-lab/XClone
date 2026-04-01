import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AdMob } from '@capacitor-community/admob'

async function initializeAds() {
  await AdMob.initialize()
}

initializeAds()

createRoot(document.getElementById("root")!).render(<App />);
