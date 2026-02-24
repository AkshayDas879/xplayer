import { Component, inject, signal, computed } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { IptvService, Channel } from '../../services/iptv.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  readonly iptvService = inject(IptvService);

  searchQuery = signal('');

  filteredChannels = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const all = this.iptvService.channels();
    if (!q) return all.slice(0, 200); // cap at 200 for performance
    return all.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.group.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q)
    ).slice(0, 200);
  });

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  selectChannel(channel: Channel) {
    this.iptvService.selectChannel(channel);
  }

  isSelected(channel: Channel): boolean {
    return this.iptvService.selectedChannel()?.url === channel.url;
  }

  getFlagEmoji(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return '';
    const offset = 127397;
    return Array.from(countryCode.toUpperCase())
      .map(c => String.fromCodePoint(c.charCodeAt(0) + offset))
      .join('');
  }

  trackById(_: number, ch: Channel) {
    return ch.url;
  }

  onLogoError(event: Event) {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
