/**
 * LiveStream Service - Video/Stream Embed in Matterport 3D Space
 * Using SDK Bundle Scene API for proper 3D canvas rendering
 * 
 * Based on Matterport SDK Bundle examples:
 * https://matterport.github.io/showcase-sdk/sdkbundle_html_livestream.html
 */

// Serverless mode - use localStorage instead of server
const STORAGE_KEY = 'matterport_livestream_config';

class LivestreamService {
  constructor() {
    this.mpSdk = null;
    this.sceneObject = null;
    this.node = null;
    this.component = null;
    this.canvas = null;
    this.ctx = null;
    this.isActive = false;
    this.animationFrame = null;
    
    // Video properties
    this.videoUrl = '';
    this.videoElement = null;
    this.isVideoPlaying = false;
    this.videoType = 'unknown';
    
    // Display properties
    this.title = 'Live Stream';
    this.showOverlay = true;
    
    // STATIC TAG CONFIGURATIONS - each tag has its own fixed position/rotation/scale
    this.tagConfigs = {
      // "video streaming" tag - Whiteboard in training room
      'video streaming': {
        position: { x: -4.57, y: 1.94, z: 5.44 },
        rotation: { x: 0, y: 181, z: 0 },
        scale: { x: 1.6, y: 0.975, z: 1 },
        resolution: { w: 1280, h: 720 }
      },
      // "Video streaming 2" tag - TV screen (moved forward on Z axis)
      'video streaming 2': {
        position: { x: -3.32, y: 1.77, z: -2.01 },  // Z moved forward
        rotation: { x: 0, y: 90, z: 0 },
        scale: { x: 1.2, y: 0.675, z: 1 },
        resolution: { w: 1280, h: 720 }
      }
    };
    
    // Default configuration (fallback)
    this.config = {
      position: { x: -4.57, y: 1.94, z: 5.44 },
      rotation: { x: 0, y: 181, z: 0 },
      scale: { x: 1.6, y: 0.975, z: 1 },
      resolution: { w: 1280, h: 720 }
    };
    
    // Current active tag name
    this.activeTagName = null;
    
    // SDK data for overlay
    this.sdkData = {
      sweeps: 0,
      floors: 0,
      tags: 0,
      rooms: 0,
      modelName: ''
    };
  }
  
  /**
   * Get configuration for a specific tag by name
   */
  getTagConfig(tagName) {
    if (!tagName) return this.config;
    
    const normalizedName = tagName.toLowerCase().trim();
    
    // Check for exact or partial match
    for (const [key, config] of Object.entries(this.tagConfigs)) {
      if (normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)) {
        console.log(`📺 Using static config for tag: "${key}"`);
        return config;
      }
    }
    
    console.log(`📺 No static config for tag "${tagName}", using default`);
    return this.config;
  }

  /**
   * Initialize the service with Matterport SDK
   */
  async initialize(mpSdk) {
    this.mpSdk = mpSdk;
    console.log('📺 LivestreamService initialized');
    console.log('📺 Scene API available:', !!mpSdk.Scene);
  }

  /**
   * Detect video URL type and return appropriate handling method
   */
  detectVideoType(url) {
    if (!url) return 'none';
    
    const urlLower = url.toLowerCase();
    
    // Direct video files
    if (urlLower.match(/\.(mp4|webm|ogg|mov|avi)($|\?)/)) {
      return 'direct';
    }
    
    // HLS streams
    if (urlLower.includes('.m3u8')) {
      return 'hls';
    }
    
    // YouTube
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      return 'youtube';
    }
    
    // Vimeo
    if (urlLower.includes('vimeo.com')) {
      return 'vimeo';
    }
    
    // Teams/Zoom/Meet (iframe only)
    if (urlLower.includes('teams.microsoft.com') || 
        urlLower.includes('zoom.us') || 
        urlLower.includes('meet.google.com')) {
      return 'meeting';
    }
    
    // RTMP/RTSP streams
    if (urlLower.startsWith('rtmp://') || urlLower.startsWith('rtsp://')) {
      return 'rtmp';
    }
    
    // Try as direct video by default
    return 'direct';
  }

  /**
   * Extract YouTube video ID from URL
   */
  extractYouTubeId(url) {
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

  /**
   * Create video element for direct video playback
   */
  createVideoElement(url) {
    console.log('📺 Creating video element for:', url);
    
    // Clean up existing video
    this.destroyVideoElement();
    this.corsRetried = false;
    this.videoError = null;
    
    const video = document.createElement('video');
    // Set crossOrigin for CORS-enabled videos (required for canvas drawing)
    video.crossOrigin = 'anonymous';
    video.muted = true; // Start muted for autoplay
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'auto';
    
    // Add to DOM temporarily (some browsers need this)
    video.style.position = 'absolute';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    document.body.appendChild(video);
    
    // Store reference to this for callbacks
    const self = this;
    
    // Event handlers
    video.onloadedmetadata = function() {
      console.log('📺 Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
    };
    
    video.onloadeddata = function() {
      console.log('📺 Video data loaded, readyState:', video.readyState);
      self.isVideoPlaying = true;
    };
    
    video.oncanplay = function() {
      console.log('📺 Video can play');
      self.isVideoPlaying = true;
      video.play().catch(e => console.log('Play after canplay failed:', e));
    };
    
    video.onplay = function() {
      console.log('📺 Video playing');
      self.isVideoPlaying = true;
    };
    
    video.onpause = function() {
      console.log('📺 Video paused');
      self.isVideoPlaying = false;
    };
    
    video.onerror = function(e) {
      const errorMsg = video.error?.message || 'Unknown error';
      console.error('📺 Video error:', errorMsg, 'Code:', video.error?.code);
      
      // If CORS error, try without crossOrigin
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
    
    video.onstalled = function() {
      console.log('📺 Video stalled');
    };
    
    video.onwaiting = function() {
      console.log('📺 Video waiting for data');
    };
    
    // Add source
    video.src = url;
    
    // Start loading
    video.load();
    
    // Try to play
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('📺 Video autoplay started');
        self.isVideoPlaying = true;
      }).catch(e => {
        console.log('📺 Autoplay blocked:', e.message);
        // Try playing muted
        video.muted = true;
        video.play().catch(e2 => console.log('Muted play also failed:', e2.message));
      });
    }
    
    this.videoElement = video;
    return video;
  }

  /**
   * Destroy video element and clean up
   */
  destroyVideoElement() {
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement.load();
      // Remove from DOM if it was added
      if (this.videoElement.parentNode) {
        this.videoElement.parentNode.removeChild(this.videoElement);
      }
      this.videoElement = null;
    }
    this.isVideoPlaying = false;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
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

  /**
   * Find a tag by its label name
   */
  async findTagByLabel(labelName) {
    if (!this.mpSdk) return null;

    try {
      const tags = [];
      
      if (this.mpSdk.Tag?.data) {
        await new Promise((resolve) => {
          this.mpSdk.Tag.data.subscribe({
            onCollectionUpdated: (collection) => {
              for (const [id, tag] of collection) {
                tags.push({ id, ...tag });
              }
              resolve();
            }
          });
          setTimeout(resolve, 3000);
        });
      }

      // Mattertag API is deprecated, use Tag.data instead

      const foundTag = tags.find(tag => 
        (tag.label && tag.label.toLowerCase().includes(labelName.toLowerCase())) ||
        (tag.name && tag.name.toLowerCase().includes(labelName.toLowerCase()))
      );

      if (foundTag) {
        console.log('📺 Found tag:', foundTag.label || foundTag.name);
        return foundTag;
      }
      return null;
    } catch (error) {
      console.error('Error finding tag:', error);
      return null;
    }
  }

  /**
   * Navigate to a tag by its ID
   */
  async navigateToTag(tagId) {
    if (!this.mpSdk || !tagId) return false;

    try {
      // Use modern Tag API for navigation
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

  /**
   * Create stream at a specific tag location using static configuration
   */
  async createStreamAtVideoTag(videoUrl, title = 'Live Stream', tagName = 'video streaming') {
    const tag = await this.findTagByLabel(tagName);
    
    // Get static configuration for this tag
    const tagConfig = this.getTagConfig(tagName);
    this.activeTagName = tagName;
    
    if (tag) {
      await this.navigateToTag(tag.sid || tag.id);
    }
    
    // Always use the static tag configuration (ignore tag's actual position)
    console.log(`📺 Creating stream at "${tagName}" with static config:`, tagConfig);
    
    return await this.createScreen({
      position: tagConfig.position,
      rotation: tagConfig.rotation,
      scale: tagConfig.scale,
      resolution: tagConfig.resolution,
      videoUrl: videoUrl,
      title: title
    });
  }
  
  /**
   * Create stream at "Video streaming 2" tag (TV screen)
   */
  async createStreamAtVideoTag2(videoUrl, title = 'Live Stream') {
    return await this.createStreamAtVideoTag(videoUrl, title, 'video streaming 2');
  }

  /**
   * Fetch livestream config from localStorage (serverless mode)
   */
  async fetchConfig(spaceId) {
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

  /**
   * Admin: Set livestream URL (localStorage - serverless mode)
   */
  async setLivestreamUrl(spaceId, videoUrl, title = 'Live Stream') {
    try {
      const config = {
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
      return { success: false, error: error.message };
    }
  }

  /**
   * Admin: Stop livestream (localStorage - serverless mode)
   */
  async stopLivestream(spaceId) {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${spaceId}`);
      if (stored) {
        const config = JSON.parse(stored);
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

  /**
   * Update SDK data for display on the screen
   */
  updateSdkData(data) {
    this.sdkData = {
      sweeps: data.sweeps?.length || 0,
      floors: data.floors?.length || 0,
      tags: data.tags?.length || 0,
      rooms: data.rooms?.length || 0,
      labels: data.labels?.length || 0,
      modelName: data.modelName || 'EAAC Training Center'
    };
  }

  /**
   * Create the Video/Stream Screen in 3D space using Scene API
   */
  async createScreen(config = {}) {
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

    // Store values before removeScreen clears them
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
      // Remove existing screen first (this clears this.videoUrl)
      await this.removeScreen();
      
      // Now set the new values AFTER removeScreen
      this.videoUrl = newVideoUrl;
      this.title = newTitle;
      this.videoType = newVideoType;
      this.config = { ...this.config, position, rotation, scale, resolution };

      console.log('📺 Creating 3D screen:', { position, rotation, scale, videoType: this.videoType });

      // Check Scene API
      if (!this.mpSdk.Scene) {
        console.error('❌ Scene API not available');
        return false;
      }

      // Create canvas element for rendering
      this.canvas = document.createElement('canvas');
      this.canvas.width = resolution.w;
      this.canvas.height = resolution.h;
      this.ctx = this.canvas.getContext('2d');

      // Setup video element if we have a playable video URL
      if (this.videoUrl && (this.videoType === 'direct' || this.videoType === 'hls')) {
        this.createVideoElement(this.videoUrl);
      }

      // Draw initial content
      this.drawScreenContent();

      // Create scene object
      const [sceneObject] = await this.mpSdk.Scene.createObjects(1);
      this.sceneObject = sceneObject;

      // Add node to scene
      const node = sceneObject.addNode();
      this.node = node;

      // Add canvas screen component (registered by matterportService)
      this.component = node.addComponent('mp.canvasScreen', {
        canvas: this.canvas,
        visible: true
      });

      // Set position
      node.position.set(position.x, position.y, position.z);
      
      // Set rotation (convert degrees to radians)
      const rotX = (rotation.x || 0) * Math.PI / 180;
      const rotY = (rotation.y || 0) * Math.PI / 180;
      const rotZ = (rotation.z || 0) * Math.PI / 180;
      
      // Apply rotation using quaternion
      if (node.quaternion) {
        // Calculate quaternion from Euler angles (YXZ order for proper 3D rotation)
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
      
      // Set scale
      node.scale.set(scale.x, scale.y, scale.z);

      // Start scene
      node.start();
      sceneObject.start();

      this.isActive = true;

      // Start render loop
      this.startRenderLoop();

      // Setup click handler
      this.setupClickHandler();

      console.log('📺 3D Screen created successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to create screen:', error.message);
      // Don't use Tag fallback - just return false
      return false;
    }
  }


  /**
   * Setup click handler for the screen
   */
  setupClickHandler() {
    if (!this.mpSdk || !this.component) return;

    // Subscribe to click events on the collider
    try {
      this.mpSdk.Pointer?.intersection?.subscribe((intersection) => {
        if (intersection?.object === this.component?.outputs?.collider) {
          this.handleScreenClick();
        }
      });
    } catch (e) {
      console.log('Click handler setup skipped:', e.message);
    }
  }

  /**
   * Handle click on the screen - open video in new tab for YouTube/meetings
   */
  handleScreenClick() {
    if (!this.videoUrl) return;

    if (this.videoType === 'youtube') {
      window.open(this.videoUrl, '_blank');
    } else if (this.videoType === 'meeting') {
      window.open(this.videoUrl, '_blank');
    } else if (this.videoType === 'vimeo') {
      window.open(this.videoUrl, '_blank');
    }
    // For direct videos, clicking does nothing (video plays on screen)
  }

  /**
   * Open video URL in new tab (can be called from UI)
   */
  openVideoExternal() {
    if (this.videoUrl) {
      window.open(this.videoUrl, '_blank');
    }
  }

  /**
   * Draw the screen content to the canvas
   * Renders video frames if available, otherwise shows placeholder
   */
  drawScreenContent() {
    if (!this.ctx || !this.canvas) return;

    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Check if we have a playing video
    if (this.videoElement && this.isVideoPlaying && this.videoElement.readyState >= 2) {
      // Draw video frame to canvas (fills entire canvas)
      try {
        ctx.drawImage(this.videoElement, 0, 0, width, height);
        
        // Draw overlay if enabled
        if (this.showOverlay) {
          this.drawOverlay(ctx, width, height);
        }
      } catch (e) {
        // Video not ready, draw placeholder
        this.drawPlaceholder(ctx, width, height);
      }
    } else {
      // No video playing, draw placeholder/info screen
      this.drawPlaceholder(ctx, width, height);
    }
  }

  /**
   * Draw overlay on top of video (title, live indicator, etc.)
   */
  drawOverlay(ctx, width, height) {
    // Semi-transparent header bar
    const headerHeight = 40;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, headerHeight);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title, 15, headerHeight / 2);

    // Live indicator (pulsing red dot)
    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
    ctx.beginPath();
    ctx.arc(width - 50, headerHeight / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LIVE', width - 40, headerHeight / 2 + 1);

    // Bottom info bar
    const bottomHeight = 30;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, height - bottomHeight, width, bottomHeight);

    // Timestamp
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(new Date().toLocaleTimeString(), width - 10, height - 10);

    // Video type indicator
    ctx.textAlign = 'left';
    ctx.fillText(`▶ ${this.videoType.toUpperCase()}`, 10, height - 10);
  }

  /**
   * Draw placeholder when no video is playing
   */
  drawPlaceholder(ctx, width, height) {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // Header
    const headerHeight = 50;
    ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.fillRect(4, 4, width - 8, headerHeight);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title, width / 2, headerHeight / 2 + 4);

    // Live indicator
    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
    ctx.beginPath();
    ctx.arc(width - 50, headerHeight / 2 + 4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LIVE', width - 38, headerHeight / 2 + 8);

    // Center content area
    const centerY = height / 2;

    // Play icon circle
    ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
    ctx.beginPath();
    ctx.arc(width / 2, centerY - 20, 50, 0, Math.PI * 2);
    ctx.fill();

    // Play triangle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 15, centerY - 45);
    ctx.lineTo(width / 2 - 15, centerY + 5);
    ctx.lineTo(width / 2 + 25, centerY - 20);
    ctx.closePath();
    ctx.fill();

    // Status text
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
        // Draw YouTube logo/icon
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.roundRect(width / 2 - 40, centerY - 55, 80, 55, 10);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(width / 2 - 12, centerY - 45);
        ctx.lineTo(width / 2 - 12, centerY - 15);
        ctx.lineTo(width / 2 + 18, centerY - 30);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#e0e7ff';
        ctx.fillText('YouTube Video', width / 2, centerY + 20);
        ctx.fillStyle = '#fbbf24';
        ctx.font = '14px Arial';
        ctx.fillText('Click screen to open in new tab', width / 2, centerY + 45);
        
        // Show video ID
        const videoId = this.extractYouTubeId(this.videoUrl);
        if (videoId) {
          ctx.fillStyle = '#6b7280';
          ctx.font = '12px Arial';
          ctx.fillText(`ID: ${videoId}`, width / 2, centerY + 70);
        }
      } else if (this.videoType === 'direct') {
        // Show video loading status
        if (this.videoError) {
          ctx.fillStyle = '#ef4444';
          ctx.fillText('Video Error', width / 2, centerY + 50);
          ctx.font = '12px Arial';
          ctx.fillText(this.videoError, width / 2, centerY + 75);
          ctx.fillStyle = '#fbbf24';
          ctx.font = '11px Arial';
          ctx.fillText('Try a CORS-enabled video URL', width / 2, centerY + 95);
        } else if (this.videoElement) {
          const readyState = this.videoElement.readyState;
          const states = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
          ctx.fillText('Loading Video...', width / 2, centerY + 50);
          ctx.fillStyle = '#a5b4fc';
          ctx.font = '14px Arial';
          ctx.fillText(`State: ${states[readyState] || readyState}`, width / 2, centerY + 75);
          if (this.videoElement.error) {
            ctx.fillStyle = '#ef4444';
            ctx.font = '12px Arial';
            ctx.fillText(`Error: ${this.videoElement.error.message}`, width / 2, centerY + 95);
          }
        } else {
          ctx.fillText('Initializing Video...', width / 2, centerY + 60);
          ctx.fillStyle = '#a5b4fc';
          ctx.font = '14px Arial';
          ctx.fillText('Creating video element', width / 2, centerY + 85);
        }
      } else {
        ctx.fillText('Stream: ' + this.videoType.toUpperCase(), width / 2, centerY + 60);
        ctx.fillStyle = '#a5b4fc';
        ctx.font = '14px Arial';
        ctx.fillText('Click to open externally', width / 2, centerY + 85);
      }
    } else {
      ctx.fillStyle = '#6b7280';
      ctx.fillText('No Stream Available', width / 2, centerY + 60);
      ctx.font = '14px Arial';
      ctx.fillText('Enter a video URL to start', width / 2, centerY + 85);
      
      // Debug info
      ctx.fillStyle = '#ef4444';
      ctx.font = '10px monospace';
      ctx.fillText(`DEBUG: videoUrl='${this.videoUrl?.substring(0,30) || 'EMPTY'}'`, width / 2, centerY + 110);
      ctx.fillText(`videoType='${this.videoType}' isPlaying=${this.isVideoPlaying}`, width / 2, centerY + 125);
    }

    // Bottom SDK data panel
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

    // Timestamp
    ctx.fillStyle = '#4b5563';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(new Date().toLocaleTimeString(), width - 15, height - 8);
  }

  /**
   * Render loop - draws content to the canvas every frame
   * The canvas is automatically rendered to the 3D plane by mp.canvasScreen component
   */
  startRenderLoop() {
    const render = () => {
      if (!this.isActive || !this.ctx || !this.canvas) {
        return;
      }

      // Draw the screen content
      this.drawScreenContent();

      // Update the canvas component input to trigger texture update
      if (this.component && this.component.inputs) {
        this.component.inputs.canvas = this.canvas;
      }

      // Schedule next frame
      this.animationFrame = requestAnimationFrame(render);
    };

    // Start rendering
    render();
  }

  /**
   * Remove the screen from the scene
   */
  async removeScreen() {
    this.isActive = false;

    // Stop animation
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Destroy video element
    this.destroyVideoElement();

    // Stop scene node
    if (this.node) {
      try {
        this.node.stop();
      } catch (e) {
        console.log('Node stop error:', e);
      }
      this.node = null;
    }

    // Stop scene object
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

  /**
   * Set video URL and optionally restart stream
   */
  setVideoUrl(url, restart = true) {
    this.videoUrl = url;
    this.videoType = this.detectVideoType(url);
    
    if (restart && this.isActive) {
      // Restart video element with new URL
      if (this.videoType === 'direct' || this.videoType === 'hls') {
        this.createVideoElement(url);
      } else {
        this.destroyVideoElement();
      }
    }
  }

  /**
   * Set title
   */
  setTitle(title) {
    this.title = title;
  }

  /**
   * Toggle overlay visibility
   */
  setOverlayVisible(visible) {
    this.showOverlay = visible;
  }

  /**
   * Play/pause video
   */
  togglePlayback() {
    if (this.videoElement) {
      if (this.videoElement.paused) {
        this.videoElement.play().catch(e => console.log('Play error:', e));
      } else {
        this.videoElement.pause();
      }
    }
  }

  /**
   * Set video muted state
   */
  setMuted(muted) {
    if (this.videoElement) {
      this.videoElement.muted = muted;
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Check if screen is active
   */
  isScreenActive() {
    return this.isActive;
  }

  /**
   * Check if video is playing
   */
  isPlaying() {
    return this.isVideoPlaying;
  }

  /**
   * Get video type
   */
  getVideoType() {
    return this.videoType;
  }

  // ==========================================
  // Compatibility aliases for existing code
  // ==========================================
  
  async createWhiteboardEmbed(config) {
    return this.createScreen(config);
  }

  async removeEmbed() {
    return this.removeScreen();
  }

  isEmbedActive() {
    return this.isScreenActive();
  }

  // Legacy Teams URL support
  setTeamsUrl(url) {
    this.setVideoUrl(url);
  }

  updateTeamsUrl(url) {
    this.setVideoUrl(url);
  }

  get teamsUrl() {
    return this.videoUrl;
  }
}

export default new LivestreamService();
