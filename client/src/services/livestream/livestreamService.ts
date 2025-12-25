/**
 * LiveStream Service - Video/Stream Embed in Matterport 3D Space
 * Using SDK Bundle Scene API for proper 3D canvas rendering
 */

import type { Position, Rotation, Tag } from '../../types.d';

const STORAGE_KEY = 'matterport_livestream_config';

// Using 'any' for SDK to avoid type compatibility issues with MatterportSDK
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MpSdk = any;

interface DataHandler {
  onCollectionUpdated: (collection: Iterable<[string, unknown]>) => void;
}

interface PointerIntersection {
  object?: unknown;
}

interface SceneObject {
  addNode: () => SceneNode;
  start: () => void;
  stop: () => void;
}

interface SceneNode {
  position: { set: (x: number, y: number, z: number) => void };
  rotation: { set: (x: number, y: number, z: number) => void };
  quaternion?: { set: (x: number, y: number, z: number, w: number) => void };
  scale: { set: (x: number, y: number, z: number) => void };
  addComponent: (name: string, options?: Record<string, unknown>) => CanvasComponent;
  start: () => void;
  stop: () => void;
}

interface CanvasComponent {
  inputs?: { canvas?: HTMLCanvasElement };
  outputs?: { collider?: unknown };
}

interface LivestreamConfig {
  position: Position;
  rotation: Rotation;
  scale: Position;
  resolution: { w: number; h: number };
}

interface TagConfig extends LivestreamConfig {
  name?: string;
  label?: string;
}

interface SdkData {
  sweeps: number;
  floors: number;
  tags: number;
  rooms: number;
  labels?: number;
  modelName: string;
}

interface StoredConfig {
  spaceId?: string;
  videoUrl?: string;
  teamsUrl?: string;
  title?: string;
  active: boolean;
  createdAt?: string;
  stoppedAt?: string;
  whiteboard?: LivestreamConfig;
}

interface CreateScreenConfig {
  position?: Position;
  rotation?: Rotation;
  scale?: Position;
  resolution?: { w: number; h: number };
  videoUrl?: string;
  teamsUrl?: string;
  title?: string;
}

interface StreamResult {
  success: boolean;
  config?: StoredConfig;
  error?: string;
}

class LivestreamService {
  private mpSdk: MpSdk | null = null;
  private sceneObject: SceneObject | null = null;
  private node: SceneNode | null = null;
  private component: CanvasComponent | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isActive: boolean = false;
  private animationFrame: number | null = null;
  
  private videoUrl: string = '';
  private videoElement: HTMLVideoElement | null = null;
  private isVideoPlaying: boolean = false;
  private videoType: string = 'unknown';
  private videoError: string | null = null;
  private corsRetried: boolean = false;
  
  private webcamStream: MediaStream | null = null;
  private isWebcamActive: boolean = false;
  
  private title: string = 'Live Stream';
  private showOverlay: boolean = true;
  
  private config: LivestreamConfig = {
    position: { x: -4.37, y: 1.64, z: 5.54 },
    rotation: { x: 0, y: 91 },
    scale: { x: 1.6, y: 0.975, z: 1 },
    resolution: { w: 1280, h: 720 }
  };
  
  private tagConfigs: Record<string, LivestreamConfig> = {
    'video streaming': {
      position: { x: -4.37, y: 1.64, z: 5.54 },
      rotation: { x: 0, y: 91 },
      scale: { x: 1.6, y: 0.975, z: 1 },
      resolution: { w: 1280, h: 720 }
    },
    'video streaming 2': {
      position: { x: -4.22, y: 1.73, z: -2.3 },
      rotation: { x: 0, y: 180 },
      scale: { x: 1.4, y: 0.9, z: 1 },
      resolution: { w: 1280, h: 720 }
    },
    'video streaming 3': {
      position: { x: -3.5, y: 1.5, z: 3.0 },
      rotation: { x: 0, y: 90 },
      scale: { x: 1.2, y: 0.7, z: 1 },
      resolution: { w: 1280, h: 720 }
    },
    'video streaming 4': {
      position: { x: -2.0, y: 1.5, z: 0.0 },
      rotation: { x: 0, y: 180 },
      scale: { x: 1.0, y: 0.6, z: 1 },
      resolution: { w: 1280, h: 720 }
    }
  };
  
  private sdkData: SdkData = {
    sweeps: 0,
    floors: 0,
    tags: 0,
    rooms: 0,
    modelName: ''
  };

  initialize(mpSdk: MpSdk): void {
    this.mpSdk = mpSdk;
    console.log('📺 LivestreamService initialized');
    console.log('📺 Scene API available:', !!mpSdk.Scene);
  }

  detectVideoType(url: string): string {
    if (!url) return 'none';
    
    const urlLower = url.toLowerCase();
    
    if (urlLower.match(/\.(mp4|webm|ogg|mov|avi)($|\?)/)) return 'direct';
    if (urlLower.includes('.m3u8')) return 'hls';
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
    if (urlLower.includes('vimeo.com')) return 'vimeo';
    if (urlLower.includes('teams.microsoft.com') || urlLower.includes('zoom.us') || urlLower.includes('meet.google.com')) return 'meeting';
    if (urlLower.startsWith('rtmp://') || urlLower.startsWith('rtsp://')) return 'rtmp';
    
    return 'direct';
  }

  async startWebcam(tagName: string = 'video streaming', title: string = 'Live Webcam'): Promise<boolean> {
    try {
      console.log('📹 Starting webcam...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: true
      });
      
      this.webcamStream = stream;
      this.isWebcamActive = true;
      this.videoType = 'webcam';
      this.title = title;
      
      this.destroyVideoElement();
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      
      video.style.position = 'absolute';
      video.style.top = '-9999px';
      video.style.left = '-9999px';
      document.body.appendChild(video);
      
      const self = this;
      video.onloadedmetadata = function(): void {
        console.log('📹 Webcam ready:', video.videoWidth, 'x', video.videoHeight);
        self.isVideoPlaying = true;
        video.play().catch(e => console.log('Webcam play error:', e));
      };
      
      this.videoElement = video;
      
      const tagConfig = this.getTagConfig(tagName);
      
      await this.createScreen({
        position: tagConfig.position,
        rotation: tagConfig.rotation,
        scale: tagConfig.scale,
        resolution: tagConfig.resolution,
        videoUrl: 'webcam',
        title: title
      });
      
      console.log('📹 Webcam streaming to 3D canvas');
      return true;
    } catch (error) {
      console.error('📹 Webcam error:', error);
      this.isWebcamActive = false;
      
      const err = error as Error & { name?: string };
      let errorMessage = 'Failed to start webcam';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found. Please connect a webcam and try again.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Camera is in use by another application. Please close other apps using the camera.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support the requested resolution. Trying with default settings...';
      }
      
      throw new Error(errorMessage);
    }
  }

  stopWebcam(): void {
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
      this.webcamStream = null;
    }
    this.isWebcamActive = false;
    this.destroyVideoElement();
    console.log('📹 Webcam stopped');
  }

  async checkWebcamAvailable(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  extractYouTubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^?&\s]+)/,
      /youtube\.com\/v\/([^?&\s]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  createVideoElement(url: string): HTMLVideoElement {
    console.log('📺 Creating video element for:', url);
    
    this.destroyVideoElement();
    this.corsRetried = false;
    this.videoError = null;
    
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'auto';
    
    video.style.position = 'absolute';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    document.body.appendChild(video);
    
    const self = this;
    
    video.onloadedmetadata = function(): void {
      console.log('📺 Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
    };
    
    video.onloadeddata = function(): void {
      console.log('📺 Video data loaded, readyState:', video.readyState);
      self.isVideoPlaying = true;
    };
    
    video.oncanplay = function(): void {
      console.log('📺 Video can play');
      self.isVideoPlaying = true;
      video.play().catch(e => console.log('Play after canplay failed:', e));
    };
    
    video.onplay = function(): void {
      console.log('📺 Video playing');
      self.isVideoPlaying = true;
    };
    
    video.onpause = function(): void {
      console.log('📺 Video paused');
      self.isVideoPlaying = false;
    };
    
    video.onerror = function(): void {
      const errorMsg = video.error?.message || 'Unknown error';
      console.error('📺 Video error:', errorMsg, 'Code:', video.error?.code);
      
      if (video.crossOrigin === 'anonymous' && !self.corsRetried) {
        console.log('📺 Retrying without CORS...');
        self.corsRetried = true;
        video.crossOrigin = null;
        video.src = url;
        video.load();
        video.play().catch(() => {});
      } else {
        self.isVideoPlaying = false;
        self.videoError = errorMsg;
      }
    };
    
    video.onstalled = function(): void {
      console.log('📺 Video stalled');
    };
    
    video.onwaiting = function(): void {
      console.log('📺 Video waiting for data');
    };
    
    video.src = url;
    video.load();
    
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('📺 Video autoplay started');
        self.isVideoPlaying = true;
      }).catch(e => {
        console.log('📺 Autoplay blocked:', e.message);
        video.muted = true;
        video.play().catch(e2 => console.log('Muted play also failed:', e2.message));
      });
    }
    
    this.videoElement = video;
    return video;
  }

  destroyVideoElement(): void {
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement.load();
      if (this.videoElement.parentNode) {
        this.videoElement.parentNode.removeChild(this.videoElement);
      }
      this.videoElement = null;
    }
    this.isVideoPlaying = false;
  }

  updateConfig(newConfig: Partial<LivestreamConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      position: { ...this.config.position, ...newConfig.position },
      rotation: { ...this.config.rotation, ...newConfig.rotation },
      scale: { ...this.config.scale, ...newConfig.scale },
      resolution: { ...this.config.resolution, ...newConfig.resolution }
    };
    console.log('📺 Config updated:', this.config);
  }

  async findTagByLabel(labelName: string): Promise<Tag | null> {
    if (!this.mpSdk) return null;

    try {
      const tags: Array<{ id: string; label?: string; name?: string; sid?: string }> = [];
      
      if (this.mpSdk.Tag?.data) {
        await new Promise<void>((resolve) => {
          this.mpSdk!.Tag!.data!.subscribe({
            onCollectionUpdated: (collection) => {
              for (const [id, tag] of collection) {
                tags.push({ id, ...(tag as Record<string, unknown>) } as { id: string; label?: string; name?: string; sid?: string });
              }
              resolve();
            }
          });
          setTimeout(resolve, 3000);
        });
      }

      const foundTag = tags.find(tag => 
        (tag.label && tag.label.toLowerCase().includes(labelName.toLowerCase())) ||
        (tag.name && tag.name.toLowerCase().includes(labelName.toLowerCase()))
      );

      if (foundTag) {
        console.log('📺 Found tag:', foundTag.label || foundTag.name);
        return foundTag as unknown as Tag;
      }
      return null;
    } catch (error) {
      console.error('Error finding tag:', error);
      return null;
    }
  }

  async navigateToTag(tagId: string): Promise<boolean> {
    if (!this.mpSdk || !tagId) return false;

    try {
      if (this.mpSdk.Tag?.dock) {
        await this.mpSdk.Tag.dock(tagId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error navigating to tag:', error);
      return false;
    }
  }

  getTagConfig(tagName: string): LivestreamConfig {
    if (!tagName) return this.config;
    
    const normalizedName = tagName.toLowerCase().trim();
    
    for (const [key, config] of Object.entries(this.tagConfigs)) {
      if (key.toLowerCase() === normalizedName) {
        console.log(`📺 Using static config for tag: "${key}"`);
        return config;
      }
    }
    
    for (const [key, config] of Object.entries(this.tagConfigs)) {
      if (normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)) {
        console.log(`📺 Using static config for tag (partial match): "${key}"`);
        return config;
      }
    }
    
    console.log(`📺 No static config for tag "${tagName}", using default`);
    return this.config;
  }

  async createStreamAtTag(tagName: string, videoUrl: string, title: string = 'Live Stream'): Promise<StreamResult> {
    const tagConfig = this.getTagConfig(tagName);
    
    console.log(`📺 Creating stream at tag "${tagName}" with static config:`, tagConfig);
    
    const result = await this.createScreen({
      position: tagConfig.position,
      rotation: tagConfig.rotation,
      scale: tagConfig.scale,
      resolution: tagConfig.resolution,
      videoUrl: videoUrl,
      title: title
    });
    
    return { success: result };
  }

  async createStreamAtVideoTag(videoUrl: string, title: string = 'Live Stream'): Promise<void> {
    await this.createStreamAtTag('video streaming', videoUrl, title);
  }

  async fetchConfig(spaceId: string): Promise<StoredConfig> {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${spaceId}`);
      if (stored) {
        return JSON.parse(stored);
      }
      return { 
        active: false, 
        spaceId,
        whiteboard: this.config
      };
    } catch (error) {
      console.error('Failed to fetch livestream config:', error);
      return { active: false, whiteboard: this.config };
    }
  }

  async setLivestreamUrl(spaceId: string, videoUrl: string, title: string = 'Live Stream'): Promise<StreamResult> {
    try {
      const config: StoredConfig = {
        spaceId,
        videoUrl,
        teamsUrl: videoUrl,
        title,
        active: true,
        createdAt: new Date().toISOString(),
        whiteboard: this.config
      };
      localStorage.setItem(`${STORAGE_KEY}_${spaceId}`, JSON.stringify(config));
      return { success: true, config };
    } catch (error) {
      console.error('Failed to set livestream:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async stopLivestream(spaceId: string): Promise<StreamResult> {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${spaceId}`);
      if (stored) {
        const config = JSON.parse(stored) as StoredConfig;
        config.active = false;
        config.stoppedAt = new Date().toISOString();
        localStorage.setItem(`${STORAGE_KEY}_${spaceId}`, JSON.stringify(config));
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to stop livestream:', error);
      return { success: false };
    }
  }

  updateSdkData(data: { sweeps?: unknown[]; floors?: unknown[]; tags?: unknown[]; rooms?: unknown[]; labels?: unknown[]; modelName?: string }): void {
    this.sdkData = {
      sweeps: data.sweeps?.length || 0,
      floors: data.floors?.length || 0,
      tags: data.tags?.length || 0,
      rooms: data.rooms?.length || 0,
      labels: data.labels?.length || 0,
      modelName: data.modelName || 'EAAC Training Center'
    };
  }

  async createScreen(config: CreateScreenConfig = {}): Promise<boolean> {
    if (!this.mpSdk) {
      console.error('SDK not initialized');
      return false;
    }

    const {
      position = this.config.position,
      rotation = this.config.rotation,
      scale = this.config.scale,
      resolution = this.config.resolution,
      videoUrl = '',
      teamsUrl = '',
      title = 'Live Stream'
    } = config;

    const newVideoUrl = videoUrl || teamsUrl;
    const newTitle = title;
    const newVideoType = this.detectVideoType(newVideoUrl);
    
    console.log('📺 createScreen called with:', {
      videoUrl: newVideoUrl,
      title: newTitle,
      videoType: newVideoType,
      position,
      rotation,
      scale
    });

    try {
      await this.removeScreen();
      
      this.videoUrl = newVideoUrl;
      this.title = newTitle;
      this.videoType = newVideoType;
      this.config = { ...this.config, position, rotation, scale, resolution };

      console.log('📺 Creating 3D screen:', { position, rotation, scale, videoType: this.videoType });

      if (!this.mpSdk.Scene) {
        console.error('❌ Scene API not available');
        return false;
      }

      this.canvas = document.createElement('canvas');
      this.canvas.width = resolution.w;
      this.canvas.height = resolution.h;
      this.ctx = this.canvas.getContext('2d');

      if (this.videoUrl && (this.videoType === 'direct' || this.videoType === 'hls' || this.videoType === 'webcam')) {
        this.createVideoElement(this.videoUrl);
      }
      
      if (this.videoUrl && this.videoType === 'youtube') {
        this.triggerYouTubeOverlay(this.videoUrl, title);
      }

      this.drawScreenContent();

      const [sceneObject] = await this.mpSdk.Scene.createObjects(1);
      this.sceneObject = sceneObject;

      const node = sceneObject.addNode();
      this.node = node;

      this.component = node.addComponent('mp.canvasScreen', {
        canvas: this.canvas,
        visible: true
      });

      node.position.set(position.x, position.y, position.z || 0);
      
      const rotX = ((rotation.x || 0) * Math.PI) / 180;
      const rotY = ((rotation.y || 0) * Math.PI) / 180;
      const rotZ = 0;
      
      if (node.quaternion) {
        const cy = Math.cos(rotY / 2);
        const sy = Math.sin(rotY / 2);
        const cx = Math.cos(rotX / 2);
        const sx = Math.sin(rotX / 2);
        const cz = Math.cos(rotZ / 2);
        const sz = Math.sin(rotZ / 2);
        
        node.quaternion.set(
          sx * cy * cz + cx * sy * sz,
          cx * sy * cz - sx * cy * sz,
          cx * cy * sz - sx * sy * cz,
          cx * cy * cz + sx * sy * sz
        );
      }
      
      node.scale.set(scale.x, scale.y, scale.z || 1);

      node.start();
      sceneObject.start();

      this.isActive = true;

      this.startRenderLoop();
      this.setupClickHandler();

      console.log('📺 3D Screen created successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to create screen:', (error as Error).message);
      return false;
    }
  }

  private setupClickHandler(): void {
    if (!this.mpSdk || !this.component) return;

    try {
      this.mpSdk.Pointer?.intersection?.subscribe((intersection) => {
        if (intersection?.object === this.component?.outputs?.collider) {
          this.handleScreenClick();
        }
      });
    } catch (e) {
      console.log('Click handler setup skipped:', (e as Error).message);
    }
  }

  private handleScreenClick(): void {
    if (!this.videoUrl) return;

    if (this.videoType === 'youtube' || this.videoType === 'meeting' || this.videoType === 'vimeo') {
      window.open(this.videoUrl, '_blank');
    }
  }

  openVideoExternal(): void {
    if (this.videoUrl) {
      window.open(this.videoUrl, '_blank');
    }
  }

  private triggerYouTubeOverlay(videoUrl: string, title: string): void {
    import('../../store/tourStore').then(({ useTourStore }) => {
      const { showYouTubeOverlay } = useTourStore.getState();
      showYouTubeOverlay(videoUrl, title);
      console.log('📺 YouTube overlay triggered for:', videoUrl);
    }).catch(err => {
      console.error('Failed to trigger YouTube overlay:', err);
    });
  }

  private hideYouTubeOverlay(): void {
    import('../../store/tourStore').then(({ useTourStore }) => {
      const { hideYouTubeOverlay } = useTourStore.getState();
      hideYouTubeOverlay();
    }).catch(err => {
      console.error('Failed to hide YouTube overlay:', err);
    });
  }

  drawScreenContent(): void {
    if (!this.ctx || !this.canvas) return;

    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    if (this.videoElement && this.isVideoPlaying && this.videoElement.readyState >= 2) {
      try {
        ctx.drawImage(this.videoElement, 0, 0, width, height);
        
        if (this.showOverlay) {
          this.drawOverlay(ctx, width, height);
        }
      } catch {
        this.drawPlaceholder(ctx, width, height);
      }
    } else {
      this.drawPlaceholder(ctx, width, height);
    }
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const headerHeight = 40;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, headerHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title, 15, headerHeight / 2);

    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
    ctx.beginPath();
    ctx.arc(width - 50, headerHeight / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LIVE', width - 40, headerHeight / 2 + 1);

    const bottomHeight = 30;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, height - bottomHeight, width, bottomHeight);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(new Date().toLocaleTimeString(), width - 10, height - 10);

    ctx.textAlign = 'left';
    ctx.fillText(`▶ ${this.videoType.toUpperCase()}`, 10, height - 10);
  }

  drawPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    const headerHeight = 50;
    ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.fillRect(4, 4, width - 8, headerHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title, width / 2, headerHeight / 2 + 4);

    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
    ctx.beginPath();
    ctx.arc(width - 50, headerHeight / 2 + 4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LIVE', width - 38, headerHeight / 2 + 8);

    const centerY = height / 2;

    ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
    ctx.beginPath();
    ctx.arc(width / 2, centerY - 20, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 15, centerY - 45);
    ctx.lineTo(width / 2 - 15, centerY + 5);
    ctx.lineTo(width / 2 + 25, centerY - 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#e0e7ff';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    
    if (this.videoUrl) {
      if (this.videoType === 'meeting') {
        ctx.fillText('Click to Join Meeting', width / 2, centerY + 60);
        ctx.fillStyle = '#a5b4fc';
        ctx.font = '14px Arial';
        ctx.fillText(this.videoUrl.substring(0, 50) + '...', width / 2, centerY + 85);
      } else if (this.videoType === 'youtube') {
        ctx.fillStyle = '#e0e7ff';
        ctx.fillText('YouTube Video', width / 2, centerY + 20);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('✓ Playing in Overlay Window', width / 2, centerY + 45);
        ctx.fillStyle = '#a5b4fc';
        ctx.font = '12px Arial';
        ctx.fillText('Look for the floating player on your screen', width / 2, centerY + 70);
        
        const videoId = this.extractYouTubeId(this.videoUrl);
        if (videoId) {
          ctx.fillStyle = '#6b7280';
          ctx.font = '11px Arial';
          ctx.fillText(`Video ID: ${videoId}`, width / 2, centerY + 95);
        }
      } else if (this.videoType === 'direct') {
        if (this.videoError) {
          ctx.fillStyle = '#ef4444';
          ctx.fillText('Video Error', width / 2, centerY + 50);
          ctx.font = '12px Arial';
          ctx.fillText(this.videoError, width / 2, centerY + 75);
        } else if (this.videoElement) {
          const readyState = this.videoElement.readyState;
          const states = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
          ctx.fillText('Loading Video...', width / 2, centerY + 50);
          ctx.fillStyle = '#a5b4fc';
          ctx.font = '14px Arial';
          ctx.fillText(`State: ${states[readyState] || readyState}`, width / 2, centerY + 75);
        } else {
          ctx.fillText('Initializing Video...', width / 2, centerY + 60);
        }
      } else {
        ctx.fillText('Stream: ' + this.videoType.toUpperCase(), width / 2, centerY + 60);
      }
    } else {
      ctx.fillStyle = '#6b7280';
      ctx.fillText('No Stream Available', width / 2, centerY + 60);
      ctx.font = '14px Arial';
      ctx.fillText('Enter a video URL to start', width / 2, centerY + 85);
    }

    const panelY = height - 70;
    ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.fillRect(10, panelY, width - 20, 60);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('SPACE DATA', 20, panelY + 15);

    const stats = [
      { label: 'Views', value: this.sdkData.sweeps },
      { label: 'Floors', value: this.sdkData.floors },
      { label: 'Tags', value: this.sdkData.tags },
      { label: 'Rooms', value: this.sdkData.rooms }
    ];

    const statWidth = (width - 40) / stats.length;
    stats.forEach((stat, i) => {
      const x = 20 + i * statWidth;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(stat.value.toString(), x, panelY + 38);
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px Arial';
      ctx.fillText(stat.label, x, panelY + 52);
    });

    ctx.fillStyle = '#4b5563';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(new Date().toLocaleTimeString(), width - 15, height - 8);
  }

  private startRenderLoop(): void {
    const render = (): void => {
      if (!this.isActive || !this.ctx || !this.canvas) {
        return;
      }

      this.drawScreenContent();

      if (this.component && this.component.inputs) {
        this.component.inputs.canvas = this.canvas;
      }

      this.animationFrame = requestAnimationFrame(render);
    };

    render();
  }

  async removeScreen(): Promise<void> {
    this.isActive = false;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.destroyVideoElement();
    this.stopWebcam();
    this.hideYouTubeOverlay();

    if (this.node) {
      try {
        this.node.stop();
      } catch (e) {
        console.log('Node stop error:', e);
      }
      this.node = null;
    }

    if (this.sceneObject) {
      try {
        this.sceneObject.stop();
      } catch (e) {
        console.log('SceneObject stop error:', e);
      }
      this.sceneObject = null;
    }

    this.component = null;
    this.canvas = null;
    this.ctx = null;
    this.videoUrl = '';

    console.log('📺 Screen removed');
  }

  setVideoUrl(url: string, restart: boolean = true): void {
    this.videoUrl = url;
    this.videoType = this.detectVideoType(url);
    
    if (restart && this.isActive) {
      if (this.videoType === 'direct' || this.videoType === 'hls') {
        this.createVideoElement(url);
      } else {
        this.destroyVideoElement();
      }
    }
  }

  setTitle(title: string): void {
    this.title = title;
  }

  setOverlayVisible(visible: boolean): void {
    this.showOverlay = visible;
  }

  togglePlayback(): void {
    if (this.videoElement) {
      if (this.videoElement.paused) {
        this.videoElement.play().catch(e => console.log('Play error:', e));
      } else {
        this.videoElement.pause();
      }
    }
  }

  setMuted(muted: boolean): void {
    if (this.videoElement) {
      this.videoElement.muted = muted;
    }
  }

  getConfig(): LivestreamConfig {
    return { ...this.config };
  }

  isScreenActive(): boolean {
    return this.isActive;
  }

  isPlaying(): boolean {
    return this.isVideoPlaying;
  }

  getVideoType(): string {
    return this.videoType;
  }

  async createWhiteboardEmbed(config: CreateScreenConfig): Promise<boolean> {
    return this.createScreen(config);
  }

  async removeEmbed(): Promise<void> {
    return this.removeScreen();
  }

  isEmbedActive(): boolean {
    return this.isScreenActive();
  }

  setTeamsUrl(url: string): void {
    this.setVideoUrl(url);
  }

  updateTeamsUrl(url: string): void {
    this.setVideoUrl(url);
  }

  get teamsUrl(): string {
    return this.videoUrl;
  }
}

export default new LivestreamService();
