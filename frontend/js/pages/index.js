// Punctul de intrare: trimite utilizatorul spre login sau spre pagina principală
import { auth } from '../core/api.js';

window.location.replace(auth.isLoggedIn ? 'home.html' : 'login.html');
