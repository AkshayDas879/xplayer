import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy, effect, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import Hls from 'hls.js';
import { IptvService, Channel } from '../../services/iptv.service';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [NgIf],
  templateUrl: './player.html',
  styleUrl: './player.css',
})
export class Player implements AfterViewInit, OnDestroy {
  @ViewChild('videoPlayer') videoElement!: ElementRef<HTMLVideoElement>;
  private hls?: Hls;

  readonly iptvService = inject(IptvService);

  // Signal-based state — works outside Angular zone (HLS.js callbacks)
  isPlaying = signal(false);
  isMuted = signal(false);
  isLive = signal(true);
  currentTime = signal('00:00');
  duration = signal('00:00');
  progress = signal(0);
  isBuffering = signal(false);

  constructor() {
    effect(() => {
      const channel = this.iptvService.selectedChannel();
      if (channel && this.videoElement) {
        this.loadChannel(channel);
      }
    });
  }

  ngAfterViewInit() {
    this.iptvService.loadPlaylist();
    this.setupListeners();
  }

  loadChannel(channel: Channel) {
    const video = this.videoElement.nativeElement;
    this.isBuffering.set(true);
    this.isPlaying.set(false);

    if (this.hls) {
      this.hls.destroy();
      this.hls = undefined;
    }

    if (Hls.isSupported()) {
      this.hls = new Hls({ autoStartLoad: true, startLevel: -1, enableWorker: true, lowLatencyMode: true });
      this.hls.loadSource(channel.url);
      this.hls.attachMedia(video);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => {
          this.isPlaying.set(true);
          this.isBuffering.set(false);
        }).catch(() => {
          this.isBuffering.set(false);
        });
      });
      this.hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          this.isBuffering.set(false);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = channel.url;
      video.play().catch(() => { });
    }
  }

  private setupListeners() {
    const video = this.videoElement.nativeElement;

    video.addEventListener('play', () => this.isPlaying.set(true));
    video.addEventListener('pause', () => this.isPlaying.set(false));
    video.addEventListener('volumechange', () => this.isMuted.set(video.muted));
    video.addEventListener('waiting', () => this.isBuffering.set(true));
    video.addEventListener('playing', () => this.isBuffering.set(false));

    video.addEventListener('timeupdate', () => {
      this.currentTime.set(this.formatTime(video.currentTime));
      this.progress.set(video.duration ? (video.currentTime / video.duration) * 100 : 0);
    });

    video.addEventListener('loadedmetadata', () => {
      if (isFinite(video.duration) && video.duration > 0) {
        this.duration.set(this.formatTime(video.duration));
        this.isLive.set(false);
      } else {
        this.isLive.set(true);
        this.duration.set('LIVE');
      }
    });
  }

  togglePlay() {
    const video = this.videoElement.nativeElement;
    video.paused ? video.play() : video.pause();
  }

  toggleMute() {
    const video = this.videoElement.nativeElement;
    video.muted = !video.muted;
  }

  toggleFullscreen() {
    const wrap = this.videoElement.nativeElement.closest('.player-wrap') as HTMLElement;
    if (!document.fullscreenElement) wrap?.requestFullscreen();
    else document.exitFullscreen();
  }

  seek(event: MouseEvent) {
    const video = this.videoElement.nativeElement;
    if (!isFinite(video.duration)) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    video.currentTime = pos * video.duration;
  }

  private formatTime(time: number): string {
    if (!isFinite(time)) return '00:00';
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  ngOnDestroy() {
    this.hls?.destroy();
  }
}
