import { useTourStore } from '../store/tourStore';
import type { Position, Rotation, ChatAction, Tag, Sweep, Floor } from '../types';

// Matterport SDK types
interface MpSdk {
  Scene?: {
    createObjects: (count: number) => Promise<SceneObject[]>;
    register: (name: string, factory: () => unknown) => Promise<void>;
  };
  Camera: {
    pose: { subscribe: (callback: (pose: CameraPose) => void) => Subscription };
    getPose: () => Promise<CameraPose>;
    setRotation: (rotation: Rotation, options?: { speed?: number }) => Promise<void>;
  };
  Sweep: {
    current: { subscribe: (callback: (sweep: Sweep) => void) => Subscription };
    data: { subscribe: (handler: DataHandler) => Subscription };
    moveTo: (sweepId: string, options?: MoveToOptions) => Promise<void>;
    Transition: { FLY: string };
  };
  Floor: {
    current: { subscribe: (callback: (floor: Floor) => void) => Subscription };
    data: { subscribe: (handler: DataHandler) => Subscription };
    moveTo: (floorId: string) => Promise<void>;
  };
  Tag?: {
    data?: { subscribe: (handler: DataHandler) => Subscription };
    open: (tagId: string) => Promise<void>;
  };
  Room?: {
    data?: { subscribe: (handler: DataHandler) => Subscription };
  };
  Label?: {
    data?: { subscribe: (handler: DataHandler) => Subscription };
  };
  Mattertag?: {
    data?: { subscribe: (handler: DataHandler) => Subscription };
  };
  Measurements?: {
    data?: { subscribe: (handler: DataHandler) => Subscription };
    mode?: { subscribe: (callback: (mode: string) => void) => Subscription };
    activate?: () => Promise<void>;
  };
  Pointer: {
    intersection: { subscribe: (callback: (intersection: PointerIntersection | null) => void) => Subscription };
  };
  Model: {
    getData: () => Promise<ModelData>;
  };
  Mode: {
    current: { subscribe: (callback: (mode: string) => void) => Subscription };
    moveTo: (mode: string) => Promise<void>;
    Mode: { INSIDE: string };
  };
}

interface Subscription {
  cancel: () => void;
}

interface DataHandler {
  onCollectionUpdated: (collection: Map<string, unknown> | Iterable<[string, unknown]>) => void;
}

interface CameraPose {
  position: Position;
  rotation: Rotation;
}

interface MoveToOptions {
  rotation?: Rotation;
  transition?: string;
  transitionTime?: number;
}

interface PointerIntersection {
  position?: Position;
  normal?: Position;
  object?: { name?: string };
  type?: string;
}

interface ModelData {
  sid: string;
  name?: string;
}

interface SceneObject {
  addNode: () => SceneNode;
  start: () => void;
  stop: () => void;
}

interface SceneNode {
  position: { set: (x: number, y: number, z: number) => void };
  rotation: { set: (x: number, y: number, z: number) => void };
  scale: { set: (x: number, y: number, z: number) => void };
  addComponent: (name: string, options?: Record<string, unknown>) => unknown;
  start: () => void;
  stop: () => void;
}

interface HtmlEmbed {
  sceneObject: SceneObject;
  node: SceneNode;
  component: unknown;
  sweepId?: string | null;
  position?: Position;
  type: string;
  streamUrl?: string;
  canvas?: HTMLCanvasElement;
  ctx?: CanvasRenderingContext2D | null;
  videoUrl?: string;
}

interface LivestreamOptions {
  sweepId?: string | null;
  position?: Position;
  rotation?: Position;
  scale?: Position;
  streamUrl?: string;
  type?: string;
}

interface VideoScreenSize {
  w: number;
  h: number;
}

interface SdkData {
  model: ModelData | null;
  sweeps: Array<{ id: string } & Record<string, unknown>>;
  floors: Array<{ id: string } & Record<string, unknown>>;
  rooms: Array<{ id: string } & Record<string, unknown>>;
  tags: Array<{ id: string } & Record<string, unknown>>;
  labels: Array<{ id: string } & Record<string, unknown>>;
  layers: Array<{ id: string } & Record<string, unknown>>;
  measurements: Array<{ id: string } & Record<string, unknown>>;
  mattertags: Array<{ id: string } & Record<string, unknown>>;
  camera: CameraPose | null;
  mode: string | null;
}

interface TagLayer {
  name: string;
  count: number;
  tags: Tag[];
}

// Extend Window interface for MP_SDK
declare global {
  interface Window {
    MP_SDK?: {
      connect: (target: HTMLIFrameElement | Window, key?: string, unused?: string) => Promise<MpSdk>;
    };
  }
}

class MatterportService {
  private mpSdk: MpSdk | null = null;
  private subscriptions: Subscription[] = [];
  private sceneObjects: Map<string, SceneObject> = new Map();
  private htmlEmbeds: Map<string, HtmlEmbed> = new Map();
  private cursorPosition: Position = { x: 0, y: 0, z: 0 };
  private canvasScreenRegistered: boolean = false;

  async connect(iframe: HTMLIFrameElement): Promise<MpSdk> {
    try {
      const sdkKey = import.meta.env.VITE_MATTERPORT_SDK_KEY || 'bnx9rtn9umenhf4ym8bngu7ud';
      
      const showcaseWindow = iframe.contentWindow as Window & { MP_SDK?: typeof window.MP_SDK };
      
      await this.waitForSDK(showcaseWindow);
      
      if (showcaseWindow && showcaseWindow.MP_SDK) {
        this.mpSdk = await showcaseWindow.MP_SDK.connect(showcaseWindow);
        console.log('🏠 Matterport SDK Bundle connected');
      } else if (window.MP_SDK) {
        this.mpSdk = await window.MP_SDK.connect(iframe, sdkKey, '');
        console.log('🏠 Matterport SDK connected');
      } else {
        throw new Error('MP_SDK not found');
      }
      
      useTourStore.getState().setMpSdk(this.mpSdk as never);
      
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

  async registerCanvasScreenComponent(): Promise<void> {
    if (!this.mpSdk?.Scene) return;

    const mpSdk = this.mpSdk;

    function CanvasScreen(this: any): void {
      this.inputs = {
        canvas: null,
        visible: true
      };
      
      this.mesh = null;
      this.texture = null;
      this.material = null;
      this.geometry = null;
      
      this.onInit = function(this: any): void {
        const THREE = this.context.three;
        
        this.geometry = new THREE.PlaneGeometry(1, 1);
        
        let canvas = this.inputs.canvas;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, 512, 512);
            ctx.fillStyle = '#fff';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Loading...', 256, 256);
          }
        }
        
        this.texture = new THREE.CanvasTexture(canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        this.texture.generateMipmaps = false;
        
        this.material = new THREE.MeshBasicMaterial({
          map: this.texture,
          side: THREE.DoubleSide,
          transparent: false
        });
        
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.visible = this.inputs.visible !== false;
        
        this.outputs.objectRoot = this.mesh;
        this.outputs.collider = this.mesh;
        
        console.log('📺 CanvasScreen component initialized');
      };

      this.onInputsUpdated = function(this: any, _previous: unknown): void {
        if (this.inputs.canvas && this.texture) {
          this.texture.image = this.inputs.canvas;
          this.texture.needsUpdate = true;
        }
        if (this.mesh) {
          this.mesh.visible = this.inputs.visible !== false;
        }
      };

      this.onTick = function(this: any, _delta: number): void {
        if (this.texture && this.inputs.canvas) {
          this.texture.needsUpdate = true;
        }
      };

      this.onDestroy = function(this: any): void {
        if (this.texture) { this.texture.dispose(); this.texture = null; }
        if (this.material) { this.material.dispose(); this.material = null; }
        if (this.geometry) { this.geometry.dispose(); this.geometry = null; }
        this.mesh = null;
        console.log('📺 CanvasScreen component destroyed');
      };
    }
    
    function CanvasScreenFactory(): unknown {
      return new (CanvasScreen as any)();
    }

    try {
      await mpSdk.Scene!.register('mp.canvasScreen', CanvasScreenFactory);
      console.log('✅ Canvas Screen component registered successfully');
      this.canvasScreenRegistered = true;
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes('already registered')) {
        console.log('✅ Canvas Screen component already registered');
        this.canvasScreenRegistered = true;
      } else {
        console.error('❌ Failed to register Canvas Screen component:', error);
        this.canvasScreenRegistered = false;
      }
    }
  }

  private waitForSDK(showcaseWindow: Window | null = null): Promise<void> {
    return new Promise((resolve, reject) => {
      const win = showcaseWindow as Window & { MP_SDK?: typeof window.MP_SDK } | null;
      
      if (window.MP_SDK || (win && win.MP_SDK)) {
        resolve();
        return;
      }
      
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.MP_SDK || (win && win.MP_SDK)) {
          clearInterval(interval);
          resolve();
        } else if (attempts > 100) {
          clearInterval(interval);
          reject(new Error('SDK load timeout'));
        }
      }, 100);
    });
  }

  private async loadTourData(): Promise<void> {
    const store = useTourStore.getState();
    
    try {
      const modelData = await this.mpSdk!.Model.getData();
      console.log('📦 Model data loaded:', modelData.sid);
      
      const iterateCollection = (
        collection: Map<string, unknown> | Iterable<[string, unknown]> | null,
        arr: Array<{ id: string } & Record<string, unknown>>
      ): void => {
        if (!collection) return;
        
        if (collection && typeof (collection as any)[Symbol.iterator] === 'function') {
          for (const [id, item] of collection as Iterable<[string, unknown]>) {
            arr.push({ id, ...(item as Record<string, unknown>) });
          }
        } else if (collection && typeof (collection as any).forEach === 'function') {
          (collection as Map<string, unknown>).forEach((item, id) => {
            arr.push({ id, ...(item as Record<string, unknown>) });
          });
        }
      };

      const sweeps: Array<{ id: string } & Record<string, unknown>> = [];
      try {
        await Promise.race([
          new Promise<void>((resolve) => {
            this.mpSdk!.Sweep.data.subscribe({
              onCollectionUpdated: (collection) => {
                iterateCollection(collection, sweeps);
                if (sweeps.length > 0) resolve();
              }
            });
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 5000))
        ]);
      } catch {
        console.log('Sweep collection:', sweeps.length);
      }

      const floors: Array<{ id: string } & Record<string, unknown>> = [];
      try {
        await Promise.race([
          new Promise<void>((resolve) => {
            this.mpSdk!.Floor.data.subscribe({
              onCollectionUpdated: (collection) => {
                iterateCollection(collection, floors);
                if (floors.length > 0) resolve();
              }
            });
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 3000))
        ]);
      } catch {
        console.log('Floor collection:', floors.length);
      }

      const tags: Array<{ id: string } & Record<string, unknown>> = [];
      try {
        await Promise.race([
          new Promise<void>((resolve) => {
            this.mpSdk!.Tag?.data?.subscribe({
              onCollectionUpdated: (collection) => {
                iterateCollection(collection, tags);
                resolve();
              }
            });
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 3000))
        ]);
      } catch {
        console.log('Tag collection:', tags.length);
      }

      const rooms: Array<{ id: string } & Record<string, unknown>> = [];
      try {
        await Promise.race([
          new Promise<void>((resolve) => {
            this.mpSdk!.Room?.data?.subscribe({
              onCollectionUpdated: (collection) => {
                iterateCollection(collection, rooms);
                resolve();
              }
            });
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 2000))
        ]);
      } catch {
        console.log('Room data not available');
      }

      store.setTourData({
        modelId: modelData.sid,
        sweeps: sweeps as never[],
        floors: floors as never[],
        rooms: rooms as never[],
        tags: tags as never[],
        measurements: [],
      });

      console.log(`📊 Tour data: ${sweeps.length} sweeps, ${floors.length} floors, ${tags.length} tags`);
      
    } catch (error) {
      console.error('Error loading tour data:', error);
    }
  }

  private setupSpatialTracking(): void {
    const store = useTourStore.getState();

    const poseSub = this.mpSdk!.Camera.pose.subscribe((pose) => {
      store.updateSpatial({
        position: pose.position,
        rotation: pose.rotation,
      });
    });
    this.subscriptions.push(poseSub);

    const sweepSub = this.mpSdk!.Sweep.current.subscribe((sweep) => {
      store.updateSpatial({ currentSweep: sweep?.id || null });
    });
    this.subscriptions.push(sweepSub);

    const floorSub = this.mpSdk!.Floor.current.subscribe((floor) => {
      store.updateSpatial({ currentFloor: floor?.sequence ?? null });
    });
    this.subscriptions.push(floorSub);

    const pointerSub = this.mpSdk!.Pointer.intersection.subscribe((intersection) => {
      if (intersection) {
        store.updateSpatial({
          lookingAt: intersection.object?.name || intersection.type || 'surface',
        });
      }
    });
    this.subscriptions.push(pointerSub);

    setInterval(async () => {
      try {
        const pose = await this.mpSdk!.Camera.getPose();
        const tourData = useTourStore.getState().tourData;
        
        const nearbyTags = tourData.tags
          .map(tag => ({
            ...tag,
            distance: this.calculateDistance(pose.position, tag.anchorPosition || tag.position)
          }))
          .filter(tag => tag.distance < 5)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5);

        store.updateSpatial({ nearbyTags: nearbyTags as never[] });
      } catch {}
    }, 1000);
  }

  private calculateDistance(pos1: Position | undefined, pos2: Position | undefined): number {
    if (!pos1 || !pos2) return Infinity;
    return Math.sqrt(
      Math.pow((pos1.x || 0) - (pos2.x || 0), 2) +
      Math.pow((pos1.y || 0) - (pos2.y || 0), 2) +
      Math.pow((pos1.z || 0) - (pos2.z || 0), 2)
    );
  }

  async navigateToSweep(sweepId: string, rotation: Rotation | null = null): Promise<boolean> {
    try {
      await this.mpSdk!.Sweep.moveTo(sweepId, {
        rotation: rotation || { x: 0, y: 0 },
        transition: this.mpSdk!.Sweep.Transition.FLY,
        transitionTime: 1500,
      });
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      return false;
    }
  }

  async navigateToTag(tagId: string): Promise<boolean> {
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

  private findNearestSweep(position: Position | undefined): Sweep | null {
    const store = useTourStore.getState();
    let nearest: Sweep | null = null;
    let minDist = Infinity;

    for (const sweep of store.tourData.sweeps) {
      const dist = this.calculateDistance(sweep.position, position);
      if (dist < minDist) {
        minDist = dist;
        nearest = sweep;
      }
    }
    return nearest;
  }

  async rotateCamera(direction: string, degrees: number = 45): Promise<boolean> {
    try {
      const pose = await this.mpSdk!.Camera.getPose();
      const newRotation: Rotation = { ...pose.rotation };

      switch (direction) {
        case 'left': newRotation.y = (newRotation.y || 0) - degrees; break;
        case 'right': newRotation.y = (newRotation.y || 0) + degrees; break;
        case 'up': newRotation.x = Math.min((newRotation.x || 0) + degrees, 90); break;
        case 'down': newRotation.x = Math.max((newRotation.x || 0) - degrees, -90); break;
        default: break;
      }

      await this.mpSdk!.Camera.setRotation(newRotation, { speed: 1 });
      return true;
    } catch (error) {
      console.error('Rotation error:', error);
      return false;
    }
  }

  async highlightTag(tagId: string): Promise<boolean> {
    try {
      await this.mpSdk!.Tag?.open(tagId);
      return true;
    } catch (error) {
      console.error('Highlight error:', error);
      return false;
    }
  }

  async changeFloor(direction: string): Promise<boolean> {
    try {
      const currentFloor = useTourStore.getState().spatial.currentFloor;
      const floors = useTourStore.getState().tourData.floors;
      
      if (currentFloor === null || !floors.length) return false;

      const currentIndex = floors.findIndex(f => f.sequence === currentFloor);
      const targetIndex = direction === 'up' 
        ? Math.min(currentIndex + 1, floors.length - 1)
        : Math.max(currentIndex - 1, 0);

      if (targetIndex !== currentIndex) {
        await this.mpSdk!.Floor.moveTo(floors[targetIndex].id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Floor change error:', error);
      return false;
    }
  }

  async executeAction(action: ChatAction): Promise<boolean> {
    console.log('🎯 Executing action:', action);
    
    switch (action.type) {
      case 'NAVIGATE':
        return await this.navigateToSweep(action.sweepId || '', action.direction ? { x: 0, y: 0 } : null);
      case 'ROTATE':
        return await this.rotateCamera(action.direction || 'right', action.degrees || 45);
      case 'HIGHLIGHT_TAG':
        return await this.highlightTag(action.tagId || '');
      case 'FLOOR':
        return await this.changeFloor(action.direction || 'up');
      case 'TOUR':
        return await this.handleTourControl(action.action || 'start');
      case 'MEASURE':
        return await this.showMeasurements();
      default:
        console.log('Unknown action:', action);
        return false;
    }
  }

  async showMeasurements(): Promise<boolean> {
    try {
      this.mpSdk!.Measurements?.mode?.subscribe((mode) => {
        console.log('Measurement mode:', mode);
      });
      
      if (this.mpSdk!.Measurements?.activate) {
        await this.mpSdk!.Measurements.activate();
      }
      
      await this.mpSdk!.Mode.moveTo(this.mpSdk!.Mode.Mode.INSIDE);
      
      console.log('📏 Measurement mode activated');
      return true;
    } catch (error) {
      console.error('Measurement error:', error);
      return false;
    }
  }

  async handleTourControl(action: string): Promise<boolean> {
    try {
      const store = useTourStore.getState();
      
      switch (action) {
        case 'start':
          const sweeps = store.tourData.sweeps;
          if (sweeps.length > 0) {
            store.startGuidedTour(sweeps.map(s => ({ sweepId: s.id, title: '', description: '' })));
            await this.navigateToSweep(sweeps[0].id);
          }
          return true;
        case 'stop':
          store.stopGuidedTour();
          return true;
        case 'next':
          return true;
        case 'prev':
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error('Tour control error:', error);
      return false;
    }
  }

  async getMeasurements(): Promise<Array<{ id: string } & Record<string, unknown>>> {
    try {
      const measurements: Array<{ id: string } & Record<string, unknown>> = [];
      this.mpSdk!.Measurements?.data?.subscribe({
        onCollectionUpdated: (collection) => {
          (collection as Map<string, unknown>).forEach((measurement, id) => {
            measurements.push({ id, ...(measurement as Record<string, unknown>) });
          });
        }
      });
      return measurements;
    } catch (error) {
      console.error('Error getting measurements:', error);
      return [];
    }
  }

  async getCurrentPose(): Promise<CameraPose | null> {
    try {
      return await this.mpSdk!.Camera.getPose();
    } catch {
      return null;
    }
  }

  async createHtmlLivestream(options: LivestreamOptions = {}): Promise<string | null> {
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
      type = 'teams'
    } = options;

    try {
      const [sceneObject] = await this.mpSdk.Scene!.createObjects(1);
      const node = sceneObject.addNode();

      node.position.set(position.x, position.y, position.z);
      node.rotation.set(
        (rotation.x || 0) * (Math.PI / 180),
        (rotation.y || 0) * (Math.PI / 180),
        (rotation.z || 0) * (Math.PI / 180)
      );
      node.scale.set(scale.x, scale.y, scale.z || 1);

      const canvasComponent = node.addComponent('mp.canvasRenderer', {
        resolution: { w: 1920, h: 1080 },
        transparent: false,
      });

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

  async createVideoScreen(
    videoUrl: string,
    position: Position,
    rotation: Position = { x: 0, y: 0, z: 0 },
    size: VideoScreenSize = { w: 1920, h: 1080 }
  ): Promise<string | null> {
    if (!this.mpSdk) return null;

    try {
      const [sceneObject] = await this.mpSdk.Scene!.createObjects(1);
      const node = sceneObject.addNode();

      node.position.set(position.x, position.y, position.z);
      node.rotation.set(
        (rotation.x || 0) * (Math.PI / 180),
        (rotation.y || 0) * (Math.PI / 180),
        (rotation.z || 0) * (Math.PI / 180)
      );

      const canvas = document.createElement('canvas');
      canvas.width = size.w;
      canvas.height = size.h;
      const ctx = canvas.getContext('2d');

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

  async navigateToLivestream(embedId: string): Promise<boolean> {
    const embed = this.htmlEmbeds.get(embedId);
    if (embed?.sweepId) {
      return await this.navigateToSweep(embed.sweepId);
    }
    return false;
  }

  async removeHtmlEmbed(embedId: string): Promise<boolean> {
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

  async fetchAllSdkData(): Promise<SdkData | null> {
    if (!this.mpSdk) return null;

    const data: SdkData = {
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
      data.model = await this.mpSdk.Model.getData();
      console.log('📦 Model:', data.model.sid);

      data.camera = await this.mpSdk.Camera.getPose();

      this.mpSdk.Mode.current.subscribe((mode) => {
        data.mode = mode;
      });

      await this.collectData(this.mpSdk.Sweep.data, data.sweeps, 'Sweeps');
      await this.collectData(this.mpSdk.Floor.data, data.floors, 'Floors');
      await this.collectData(this.mpSdk.Tag?.data, data.tags, 'Tags');
      await this.collectData(this.mpSdk.Mattertag?.data, data.mattertags, 'Mattertags');
      await this.collectData(this.mpSdk.Label?.data, data.labels, 'Labels');
      await this.collectData(this.mpSdk.Room?.data, data.rooms, 'Rooms');
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

  private async collectData(
    observable: { subscribe: (handler: DataHandler) => Subscription } | undefined,
    targetArray: Array<{ id: string } & Record<string, unknown>>,
    name: string
  ): Promise<void> {
    if (!observable) return;
    
    try {
      await Promise.race([
        new Promise<void>((resolve) => {
          observable.subscribe({
            onCollectionUpdated: (collection) => {
              (collection as Map<string, unknown>).forEach((item, id) => {
                targetArray.push({ id, ...(item as Record<string, unknown>) });
              });
              resolve();
            }
          });
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 3000))
      ]);
      console.log(`  ✓ ${name}: ${targetArray.length}`);
    } catch {
      console.log(`  ✗ ${name}: failed`);
    }
  }

  setupCursorTracking(): void {
    if (!this.mpSdk) return;

    this.mpSdk.Pointer.intersection.subscribe((intersection) => {
      if (intersection) {
        this.cursorPosition = intersection.position || { x: 0, y: 0, z: 0 };
        
        useTourStore.getState().updateSpatial({
          cursorPosition: this.cursorPosition,
          cursorObject: intersection.object?.name || intersection.type || null,
          cursorNormal: intersection.normal || null,
        });
      }
    });
  }

  getSweepByScanNumber(scanNumber: number): Sweep | null {
    const sweeps = useTourStore.getState().tourData.sweeps;
    if (scanNumber > 0 && scanNumber <= sweeps.length) {
      return sweeps[scanNumber - 1];
    }
    return null;
  }

  async navigateToScan(scanNumber: number): Promise<boolean> {
    const sweep = this.getSweepByScanNumber(scanNumber);
    if (sweep) {
      return await this.navigateToSweep(sweep.id);
    }
    return false;
  }

  getTagLayers(): TagLayer[] {
    const tags = useTourStore.getState().tourData.tags;
    const layers = new Map<string, Tag[]>();
    
    tags.forEach(tag => {
      const category = tag.label || 'Uncategorized';
      if (!layers.has(category)) {
        layers.set(category, []);
      }
      layers.get(category)!.push(tag);
    });

    return Array.from(layers.entries()).map(([name, tags]) => ({
      name,
      count: tags.length,
      tags
    }));
  }

  disconnect(): void {
    this.htmlEmbeds.forEach((embed) => {
      try {
        embed.node?.stop();
        embed.sceneObject?.stop();
      } catch {}
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
