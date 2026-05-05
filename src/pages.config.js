/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminAssets from './pages/AdminAssets';
import AdminShips from './pages/AdminShips';
import AdminStory from './pages/AdminStory';
import Arena from './pages/Arena';
import Campaign from './pages/Campaign';
import Codex from './pages/Codex';
import Gallery from './pages/Gallery';
import Game from './pages/Game';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminAssets": AdminAssets,
    "AdminShips": AdminShips,
    "AdminStory": AdminStory,
    "Arena": Arena,
    "Campaign": Campaign,
    "Codex": Codex,
    "Gallery": Gallery,
    "Game": Game,
}

export const pagesConfig = {
    mainPage: "Game",
    Pages: PAGES,
    Layout: __Layout,
};