import { Component, signal } from '@angular/core';
import { Header } from './components/header/header';
import { Sidebar } from './components/sidebar/sidebar';
import { Player } from './components/player/player';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Header, Sidebar, Player],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('xplayer');
}
