import { useTourStore } from '../store/tourStore';

class MatterportService {
  constructor() {
    this.mpSdk = null;
    this.subscriptions = [];
    this.sceneObjects = new Map();
    this.htmlEmbeds = new Map();
    this.cursorPosition = { x: 0, y: 0, z: 0 };
  }

  async connect(iframe) {
    try {
      const sdkKey = import.meta.env.VITE_MATTERPORT_SDK_KEY || 'bnx9rtn9umenhf4ym8bngu7ud';
      
      // For SDK Bundle, connect through the iframe's contentWindow
      const showcaseWindow = iframe.contentWindow;
      
      // Wait for SDK to be available (either global or in iframe)
      await this.waitForSDK(showcaseWindow);
      
      // Connect to SDK - Bundle uses showcaseWindow.MP_SDK
      if (showcaseWindow && showcaseWindow.MP_SDK) {
        // SDK Bundle connection
        this.mpSdk = await showcaseWindow.MP_SDK.connect(showcaseWindow);
        console.log('🏠 Matterport SDK Bundle connected');
      } else if (window.MP_SDK) {
        // Regular SDK connection
        this.mpSdk = await window.MP_SDK.connect(iframe, sdkKey, '');
        console.log('🏠 Matterport SDK connected');
      } else {
        throw new Error('MP_SDK not found');
      }
      
      useTourStore.getState().setMpSdk(this.mpSdk);
      
      // Check if Scene API is available (Bundle only)
      if (this.mpSdk.Scene) {
        console.log('✅ Scene API available - 3D objects supported');
        await this.registerCanvasScreenComponent();
      } else {
        console.log('⚠️ Scene API not available - using fallback methods');
      }
      
      await this.loadTourData();
      this.setupSpatialTracking();
      this.setupCursorTracking();
      
      return this.mpSdk;
    } catch (error) {
      console.error('Failed to connect to Matterport SDK:', error);
      throw error;
    }
  }

  /**
   * Register custom canvas screen component for 3D HTML rendering
   */
  async registerCanvasScreenComponent() {
    if (!this.mpSdk?.Scene) return;

    // Store reference to mpSdk for the component
    const mpSdk = this.mpSdk;

    // Register a custom component using SDK's constructor pattern
    function CanvasScreen() {
      this.inputs = {
        canvas: null,
        visible: true
      };
      
      // Store references for cleanup
      this.mesh = null;
      this.texture = null;
      this.material = null;
      this.geometry = null;
      
      this.onInit = function() {
        const THREE = this.context.three;
        
        // Create plane geometry (1x1, scaled by node)
        this.geometry = new THREE.PlaneGeometry(1, 1);
        
        // Create initial canvas if not provided
        let canvas = this.inputs.canvas;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(0, 0, 512, 512);
          ctx.fillStyle = '#fff';
          ctx.font = '24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Loading...', 256, 256);
        }
        
        // Create canvas texture
        this.texture = new THREE.CanvasTexture(canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        this.texture.generateMipmaps = false;
        
        // Create material
        this.material = new THREE.MeshBasicMaterial({
          map: this.texture,
          side: THREE.DoubleSide,
          transparent: false
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.visible = this.inputs.visible !== false;
        
        // Set outputs - SDK provides this.outputs automatically
        this.outputs.objectRoot = this.mesh;
        this.outputs.collider = this.mesh;
        
        console.log('📺 CanvasScreen component initialized');
      };

      this.onInputsUpdated = function(previous) {
        if (this.inputs.canvas && this.texture) {
          this.texture.image = this.inputs.canvas;
          this.texture.needsUpdate = true;
        }
        if (this.mesh) {
          this.mesh.visible = this.inputs.visible !== false;
        }
      };

      this.onTick = function(delta) {
        // Update texture every frame for video
        if (this.texture && this.inputs.canvas) {
          this.texture.needsUpdate = true;
        }
      };

      this.onDestroy = function() {
        if (this.texture) { this.texture.dispose(); this.texture = null; }
        if (this.material) { this.material.dispose(); this.material = null; }
        if (this.geometry) { this.geometry.dispose(); this.geometry = null; }
        this.mesh = null;
        console.log('📺 CanvasScreen component destroyed');
      };
    }
    
    // Factory function that returns new component instance
    function CanvasScreenFactory() {
      return new CanvasScreen();
    }

    try {
      await mpSdk.Scene.register('mp.canvasScreen', CanvasScreenFactory);
      console.log('✅ Canvas Screen component registered successfully');
      this.canvasScreenRegistered = true;
    } catch (error) {
      if (error.message?.includes('already registered')) {
        console.log('✅ Canvas Screen component already registered');
        this.canvasScreenRegistered = true;
      } else {
        console.error('❌ Failed to register Canvas Screen component:', error);
        this.canvasScreenRegistered = false;
      }
    }
  }

  waitForSDK(showcaseWindow = null) {
    return new Promise((resolve, reject) => {
      // Check both window and showcaseWindow for SDK
      if (window.MP_SDK || (showcaseWindow && showcaseWindow.MP_SDK)) {
        resolve();
        return;
      }
      
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.MP_SDK || (showcaseWindow && showcaseWindow.MP_SDK)) {
          clearInterval(interval);
          resolve();
        } else if (attempts > 100) {
          clearInterval(interval);
          reject(new Error('SDK load timeout'));
        }
      }, 100);
    });
  }

  async loadTourData() {
    const store = useTourStore.getState();
    
    try {
      const modelData = await this.mpSdk.Model.getData();
      console.log('📦 Model data loaded:', modelData.sid);
      
      // Helper function to safely iterate SDK collections
      const iterateCollection = (collection, arr) => {
        if (collection && typeof collection[Symbol.iterator] === 'function') {
          for (const [id, item] of collection) {
            arr.push({ id, ...item });
          }
        } else if (collection && typeof collection.forEach === 'function') {
          collection.forEach((item, id) => arr.push({ id, ...item }));
        }
      };

      // Collect sweeps with timeout
      const sweeps = [];
      try {
        await Promise.race([
          new Promise((resolve) => {
            this.mpSdk.Sweep.data.subscribe({
              onCollectionUpdated: (collection) => {
                iterateCollection(collection, sweeps);
                if (sweeps.length > 0) resolve();
              }
            });
          }),
          new Promise((resolve) => setTimeout(resolve, 5000))
        ]);
      } catch (e) {
        console.log('Sweep collection:', sweeps.length);
      }

      // Collect floors with timeout
      const floors = [];
      try {
        await Promise.race([
          new Promise((resolve) => {
            this.mpSdk.Floor.data.subscribe({
              onCollectionUpdated: (collection) => {
                iterateCollection(collection, floors);
                if (floors.length > 0) resolve();
              }
            });
          }),
          new Promise((resolve) => setTimeout(resolve, 3000))
        ]);
      } catch (e) {
        console.log('Floor collection:', floors.length);
      }

      // Collect tags with timeout
      const tags = [];
      try {
        await Promise.race([
          new Promise((resolve) => {
            this.mpSdk.Tag?.data?.subscribe({
              onCollectionUpdated: (collection) => {
                iterateCollection(collection, tags);
                resolve();
              }
            });
          }),
          new Promise((resolve) => setTimeout(resolve, 3000))
        ]);
      } catch (e) {
        console.log('Tag collection:', tags.length);
      }

      // Collect rooms
      let rooms = [];
      try {
        await Promise.race([
          new Promise((resolve) => {
            this.mpSdk.Room?.data?.subscribe({
              onCollectionUpdated: (collection) => {
                iterateCollection(collection, rooms);
                resolve();
              }
            });
          }),
          new Promise((resolve) => setTimeout(resolve, 2000))
        ]);
      } catch (e) {
        console.log('Room data not available');
      }

      store.setTourData({
        modelId: modelData.sid,
        modelName: modelData.name,
        sweeps,
        floors,
        rooms,
        tags,
        measurements: [],
      });

      console.log(`📊 Tour data: ${sweeps.length} sweeps, ${floors.length} floors, ${tags.length} tags`);
      
    } catch (error) {
      console.error('Error loading tour data:', error);
    }
  }

  setupSpatialTracking() {
    const store = useTourStore.getState();

    // Camera pose
    const poseSub = this.mpSdk.Camera.pose.subscribe((pose) => {
      store.updateSpatial({
        position: pose.position,
        rotation: pose.rotation,
      });
    });
    this.subscriptions.push(poseSub);

    // Current sweep
    const sweepSub = this.mpSdk.Sweep.current.subscribe((sweep) => {
      store.updateSpatial({ currentSweep: sweep });
    });
    this.subscriptions.push(sweepSub);

    // Current floor
    const floorSub = this.mpSdk.Floor.current.subscribe((floor) => {
      store.updateSpatial({ currentFloor: floor });
    });
    this.subscriptions.push(floorSub);

    // Pointer intersection
    const pointerSub = this.mpSdk.Pointer.intersection.subscribe((intersection) => {
      if (intersection) {
        store.updateSpatial({
          lookingAt: intersection.object?.name || intersection.type || 'surface',
        });
      }
    });
    this.subscriptions.push(pointerSub);

    // Nearby tags tracking
    setInterval(async () => {
      try {
        const pose = await this.mpSdk.Camera.getPose();
        const tourData = useTourStore.getState().tourData;
        
        const nearbyTags = tourData.tags
          .map(tag => ({
            ...tag,
            distance: this.calculateDistance(pose.position, tag.anchorPosition || tag.position)
          }))
          .filter(tag => tag.distance < 5)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5);

        store.updateSpatial({ nearbyTags });
      } catch (e) {}
    }, 1000);
  }

  calculateDistance(pos1, pos2) {
    if (!pos1 || !pos2) return Infinity;
    return Math.sqrt(
      Math.pow((pos1.x || 0) - (pos2.x || 0), 2) +
      Math.pow((pos1.y || 0) - (pos2.y || 0), 2) +
      Math.pow((pos1.z || 0) - (pos2.z || 0), 2)
    );
  }

  // Navigation
  async navigateToSweep(sweepId, rotation = null) {
    try {
      await this.mpSdk.Sweep.moveTo(sweepId, {
        rotation: rotation || { x: 0, y: 0 },
        transition: this.mpSdk.Sweep.Transition.FLY,
        transitionTime: 1500,
      });
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      return false;
    }
  }

  async navigateToTag(tagId) {
    const store = useTourStore.getState();
    const tag = store.tourData.tags.find(t => t.id === tagId);
    
    if (tag) {
      const nearestSweep = this.findNearestSweep(tag.anchorPosition || tag.position);
      if (nearestSweep) {
        await this.navigateToSweep(nearestSweep.id);
        return true;
      }
    }
    return false;
  }

  findNearestSweep(position) {
    const store = useTourStore.getState();
    let nearest = null;
    let minDist = Infinity;

    for (const sweep of store.tourData.sweeps) {
      if (sweep.enabled !== false) {
        const dist = this.calculateDistance(sweep.position, position);
        if (dist < minDist) {
          minDist = dist;
          nearest = sweep;
        }
      }
    }
    return nearest;
  }

  async rotateCamera(direction, degrees = 45) {
    try {
      const pose = await this.mpSdk.Camera.getPose();
      let newRotation = { ...pose.rotation };

      switch (direction) {
        case 'left': newRotation.y -= degrees; break;
        case 'right': newRotation.y += degrees; break;
        case 'up': newRotation.x = Math.min(newRotation.x + degrees, 90); break;
        case 'down': newRotation.x = Math.max(newRotation.x - degrees, -90); break;
        default: break;
      }

      await this.mpSdk.Camera.setRotation(newRotation, { speed: 1 });
      return true;
    } catch (error) {
      console.error('Rotation error:', error);
      return false;
    }
  }

  async highlightTag(tagId) {
    try {
      await this.mpSdk.Tag.open(tagId);
      return true;
    } catch (error) {
      console.error('Highlight error:', error);
      return false;
    }
  }

  async changeFloor(direction) {
    try {
      const currentFloor = useTourStore.getState().spatial.currentFloor;
      const floors = useTourStore.getState().tourData.floors;
      
      if (!currentFloor || !floors.length) return false;

      const currentIndex = floors.findIndex(f => f.id === currentFloor.id);
      const targetIndex = direction === 'up' 
        ? Math.min(currentIndex + 1, floors.length - 1)
        : Math.max(currentIndex - 1, 0);

      if (targetIndex !== currentIndex) {
        await this.mpSdk.Floor.moveTo(floors[targetIndex].id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Floor change error:', error);
      return false;
    }
  }

  // Execute AI action
  async executeAction(action) {
    console.log('🎯 Executing action:', action);
    
    switch (action.type) {
      case 'NAVIGATE':
        return await this.navigateToSweep(action.sweepId, action.rotation);
      case 'ROTATE':
        return await this.rotateCamera(action.direction, action.degrees || 45);
      case 'HIGHLIGHT_TAG':
        return await this.highlightTag(action.tagId);
      case 'CHANGE_FLOOR':
        return await this.changeFloor(action.direction);
      case 'TOUR_CONTROL':
        return await this.handleTourControl(action.action);
      case 'SHOW_MEASUREMENT':
        return await this.showMeasurements();
      default:
        console.log('Unknown action:', action);
        return false;
    }
  }

  // Show measurement mode
  async showMeasurements() {
    try {
      // Enable measurement mode in Matterport
      await this.mpSdk.Measurements.mode.subscribe((mode) => {
        console.log('Measurement mode:', mode);
      });
      
      // Try to activate measurement tool
      if (this.mpSdk.Measurements?.activate) {
        await this.mpSdk.Measurements.activate();
      }
      
      // Alternative: Use the mode API
      await this.mpSdk.Mode.moveTo(this.mpSdk.Mode.Mode.INSIDE);
      
      console.log('📏 Measurement mode activated');
      return true;
    } catch (error) {
      console.error('Measurement error:', error);
      return false;
    }
  }

  // Handle guided tour control
  async handleTourControl(action) {
    try {
      const store = useTourStore.getState();
      
      switch (action) {
        case 'start':
          // Start guided tour through sweeps
          const sweeps = store.tourData.sweeps.filter(s => s.enabled !== false);
          if (sweeps.length > 0) {
            store.startGuidedTour(sweeps.map(s => s.id));
            await this.navigateToSweep(sweeps[0].id);
          }
          return true;
        case 'stop':
          store.stopGuidedTour();
          return true;
        case 'next':
          // Navigate to next sweep in tour
          return true;
        case 'prev':
          // Navigate to previous sweep
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error('Tour control error:', error);
      return false;
    }
  }

  // Get all measurements data
  async getMeasurements() {
    try {
      const measurements = [];
      await this.mpSdk.Measurements.data.subscribe({
        onCollectionUpdated: (collection) => {
          collection.forEach((measurement, id) => {
            measurements.push({ id, ...measurement });
          });
        }
      });
      return measurements;
    } catch (error) {
      console.error('Error getting measurements:', error);
      return [];
    }
  }

  // Get current pose
  async getCurrentPose() {
    try {
      return await this.mpSdk.Camera.getPose();
    } catch (error) {
      return null;
    }
  }

  // ==========================================
  // HTML LIVESTREAM EMBEDDING (Like Matterport SDK Examples)
  // ==========================================

  /**
   * Create HTML Canvas/Video embed in 3D space
   * This implements the HTML Livestream feature from Matterport SDK
   */
  async createHtmlLivestream(options = {}) {
    if (!this.mpSdk) {
      console.error('SDK not connected');
      return null;
    }

    const {
      sweepId = null,
      position = { x: 0, y: 1.5, z: -2 },
      rotation = { x: 0, y: 0, z: 0 },
      scale = { x: 1.8, y: 1.0, z: 0.01 },
      streamUrl = '',
      type = 'teams' // 'teams', 'youtube', 'custom'
    } = options;

    try {
      // Create scene object for the HTML embed
      const [sceneObject] = await this.mpSdk.Scene.createObjects(1);
      const node = sceneObject.addNode();

      // Set node transform
      node.position.set(position.x, position.y, position.z);
      node.rotation.set(
        rotation.x * (Math.PI / 180),
        rotation.y * (Math.PI / 180),
        rotation.z * (Math.PI / 180)
      );
      node.scale.set(scale.x, scale.y, scale.z);

      // Add canvas renderer component for HTML content
      const canvasComponent = node.addComponent('mp.canvasRenderer', {
        resolution: { w: 1920, h: 1080 },
        transparent: false,
      });

      // Start the node
      node.start();

      const embedId = `livestream-${Date.now()}`;
      this.htmlEmbeds.set(embedId, {
        sceneObject,
        node,
        component: canvasComponent,
        sweepId,
        position,
        type,
        streamUrl
      });

      console.log('📺 HTML Livestream created:', embedId);
      return embedId;
    } catch (error) {
      console.error('Failed to create HTML livestream:', error);
      return null;
    }
  }

  /**
   * Create a video screen in 3D space using canvas renderer
   */
  async createVideoScreen(videoUrl, position, rotation = { x: 0, y: 0, z: 0 }, size = { w: 1920, h: 1080 }) {
    if (!this.mpSdk) return null;

    try {
      const [sceneObject] = await this.mpSdk.Scene.createObjects(1);
      const node = sceneObject.addNode();

      // Position the screen
      node.position.set(position.x, position.y, position.z);
      node.rotation.set(
        rotation.x * (Math.PI / 180),
        rotation.y * (Math.PI / 180),
        rotation.z * (Math.PI / 180)
      );

      // Create canvas for video rendering
      const canvas = document.createElement('canvas');
      canvas.width = size.w;
      canvas.height = size.h;
      const ctx = canvas.getContext('2d');

      // Add canvas renderer
      const canvasComponent = node.addComponent('mp.canvasRenderer', {
        resolution: size,
        transparent: false,
      });

      node.start();

      const embedId = `video-${Date.now()}`;
      this.htmlEmbeds.set(embedId, {
        sceneObject,
        node,
        component: canvasComponent,
        canvas,
        ctx,
        type: 'video',
        videoUrl
      });

      return embedId;
    } catch (error) {
      console.error('Failed to create video screen:', error);
      return null;
    }
  }

  /**
   * Navigate to sweep where livestream is embedded
   */
  async navigateToLivestream(embedId) {
    const embed = this.htmlEmbeds.get(embedId);
    if (embed?.sweepId) {
      return await this.navigateToSweep(embed.sweepId);
    }
    return false;
  }

  /**
   * Remove HTML embed from scene
   */
  async removeHtmlEmbed(embedId) {
    const embed = this.htmlEmbeds.get(embedId);
    if (embed) {
      try {
        embed.node.stop();
        embed.sceneObject.stop();
        this.htmlEmbeds.delete(embedId);
        console.log('🗑️ Removed HTML embed:', embedId);
        return true;
      } catch (error) {
        console.error('Failed to remove embed:', error);
      }
    }
    return false;
  }

  // ==========================================
  // ENHANCED DATA FETCHING (All SDK Data)
  // ==========================================

  /**
   * Fetch all available data from Matterport SDK
   */
  async fetchAllSdkData() {
    if (!this.mpSdk) return null;

    const data = {
      model: null,
      sweeps: [],
      floors: [],
      rooms: [],
      tags: [],
      labels: [],
      layers: [],
      measurements: [],
      mattertags: [],
      camera: null,
      mode: null,
    };

    try {
      // Model data
      data.model = await this.mpSdk.Model.getData();
      console.log('📦 Model:', data.model.sid);

      // Camera data
      data.camera = await this.mpSdk.Camera.getPose();

      // Current mode
      const modeData = await this.mpSdk.Mode.current.subscribe((mode) => {
        data.mode = mode;
      });

      // Sweeps
      await this.collectData(this.mpSdk.Sweep.data, data.sweeps, 'Sweeps');

      // Floors
      await this.collectData(this.mpSdk.Floor.data, data.floors, 'Floors');

      // Tags
      await this.collectData(this.mpSdk.Tag?.data, data.tags, 'Tags');

      // Mattertags (legacy)
      await this.collectData(this.mpSdk.Mattertag?.data, data.mattertags, 'Mattertags');

      // Labels
      await this.collectData(this.mpSdk.Label?.data, data.labels, 'Labels');

      // Rooms
      await this.collectData(this.mpSdk.Room?.data, data.rooms, 'Rooms');

      // Measurements
      await this.collectData(this.mpSdk.Measurements?.data, data.measurements, 'Measurements');

      console.log('📊 All SDK data fetched:', {
        sweeps: data.sweeps.length,
        floors: data.floors.length,
        tags: data.tags.length,
        rooms: data.rooms.length,
        labels: data.labels.length,
      });

      return data;
    } catch (error) {
      console.error('Error fetching SDK data:', error);
      return data;
    }
  }

  /**
   * Helper to collect data from SDK observables
   */
  async collectData(observable, targetArray, name) {
    if (!observable) return;
    
    try {
      await Promise.race([
        new Promise((resolve) => {
          observable.subscribe({
            onCollectionUpdated: (collection) => {
              collection.forEach((item, id) => {
                targetArray.push({ id, ...item });
              });
              resolve();
            }
          });
        }),
        new Promise((resolve) => setTimeout(resolve, 3000))
      ]);
      console.log(`  ✓ ${name}: ${targetArray.length}`);
    } catch (e) {
      console.log(`  ✗ ${name}: failed`);
    }
  }

  /**
   * Get cursor/pointer 3D position
   */
  setupCursorTracking() {
    if (!this.mpSdk) return;

    this.mpSdk.Pointer.intersection.subscribe((intersection) => {
      if (intersection) {
        this.cursorPosition = intersection.position || { x: 0, y: 0, z: 0 };
        
        // Update store with cursor position
        useTourStore.getState().updateSpatial({
          cursorPosition: this.cursorPosition,
          cursorObject: intersection.object?.name || intersection.type || null,
          cursorNormal: intersection.normal || null,
        });
      }
    });
  }

  /**
   * Get sweep by index (scan number)
   */
  getSweepByScanNumber(scanNumber) {
    const sweeps = useTourStore.getState().tourData.sweeps;
    if (scanNumber > 0 && scanNumber <= sweeps.length) {
      return sweeps[scanNumber - 1]; // Scan numbers are 1-indexed
    }
    return null;
  }

  /**
   * Navigate to scan by number
   */
  async navigateToScan(scanNumber) {
    const sweep = this.getSweepByScanNumber(scanNumber);
    if (sweep) {
      return await this.navigateToSweep(sweep.id);
    }
    return false;
  }

  /**
   * Get all layers/categories from tags
   */
  getTagLayers() {
    const tags = useTourStore.getState().tourData.tags;
    const layers = new Map();
    
    tags.forEach(tag => {
      const category = tag.label || tag.category || 'Uncategorized';
      if (!layers.has(category)) {
        layers.set(category, []);
      }
      layers.get(category).push(tag);
    });

    return Array.from(layers.entries()).map(([name, tags]) => ({
      name,
      count: tags.length,
      tags
    }));
  }

  disconnect() {
    // Clean up HTML embeds
    this.htmlEmbeds.forEach((embed, id) => {
      try {
        embed.node?.stop();
        embed.sceneObject?.stop();
      } catch (e) {}
    });
    this.htmlEmbeds.clear();
    this.sceneObjects.clear();

    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.cancel === 'function') {
        sub.cancel();
      }
    });
    this.subscriptions = [];
    this.mpSdk = null;
  }
}

export default new MatterportService();
