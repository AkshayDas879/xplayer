import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Channel {
    name: string;
    url: string;
    logo: string;
    group: string;
    country: string;
}

@Injectable({ providedIn: 'root' })
export class IptvService {
    private readonly M3U_URL = 'https://iptv-org.github.io/iptv/index.m3u';

    channels = signal<Channel[]>([]);
    selectedChannel = signal<Channel | null>(null);
    isLoading = signal(false);
    error = signal<string | null>(null);

    constructor(private http: HttpClient) { }

    loadPlaylist(): void {
        this.isLoading.set(true);
        this.error.set(null);

        this.http.get(this.M3U_URL, { responseType: 'text' }).subscribe({
            next: (text) => {
                const parsed = this.parseM3U(text);
                this.channels.set(parsed);
                this.isLoading.set(false);
                // Auto-select the first valid channel
                if (parsed.length > 0) {
                    this.selectedChannel.set(parsed[0]);
                }
            },
            error: (err) => {
                this.error.set('Failed to load playlist. Check CORS proxy or network.');
                this.isLoading.set(false);
                console.error('[IptvService] Error loading playlist:', err);
            }
        });
    }

    selectChannel(channel: Channel): void {
        this.selectedChannel.set(channel);
    }

    private parseM3U(text: string): Channel[] {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const channels: Channel[] = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('#EXTINF:')) {
                const infoLine = lines[i];
                const url = lines[i + 1];

                if (!url || url.startsWith('#')) continue;

                // Extract tvg attributes
                const nameMatch = infoLine.match(/,(.+)$/);
                const logoMatch = infoLine.match(/tvg-logo="([^"]*)"/);
                const groupMatch = infoLine.match(/group-title="([^"]*)"/);
                const countryMatch = infoLine.match(/tvg-country="([^"]*)"/);

                channels.push({
                    name: nameMatch ? nameMatch[1].trim() : 'Unknown',
                    url: url.trim(),
                    logo: logoMatch ? logoMatch[1] : '',
                    group: groupMatch ? groupMatch[1] : 'Other',
                    country: countryMatch ? countryMatch[1] : '',
                });

                i++; // skip the URL line
            }
        }

        return channels;
    }
}
