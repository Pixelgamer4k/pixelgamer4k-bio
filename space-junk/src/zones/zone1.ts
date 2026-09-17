import * as THREE from 'three';
import { DebrisField, createSalvage, type SalvagePiece } from '../entities/salvage';
import { DroneSwarm } from '../entities/drone';
import { JunkBehemoth } from '../entities/boss';
import { buildZone1Environment, type EnvBuildResult } from './environment';
import { randRange } from '../util/math';
import type { CollisionWorld } from '../systems/collision';

export type MissionBeat =
  | 'intro'
  | 'collect'
  | 'drones'
  | 'extract'
  | 'complete';

/**
 * Zone 1 only — Collect 3 Power Cells in 3D space → drones → extract.
 * Junk Behemoth spawns only after 3/3 cells (during extract beat).
 */
export class Zone1 {
  debris = new DebrisField();
  drones = new DroneSwarm();
  boss: JunkBehemoth | null = null;
  powerCells: SalvagePiece[] = [];
  extractPad: THREE.Mesh;
  beat: MissionBeat = 'intro';
  cellsCollected = 0;
  raresCollected = 0;
  readonly cellsNeeded = 3;
  readonly raresOptional = 10;
  extracted = false;
  bossDefeated = false;
  world!: CollisionWorld;
  debrisRoot!: THREE.Group;
  private bossSpawned = false;
  private env!: EnvBuildResult;

  private constructor(private scene: THREE.Scene) {
    this.extractPad = new THREE.Mesh(
      new THREE.TorusGeometry(6, 0.35, 8, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x88aaff,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.55,
      }),
    );
    this.extractPad.rotation.x = Math.PI / 2;
    this.extractPad.position.set(38, 6, 38);
    this.extractPad.visible = false;
  }

  static async create(scene: THREE.Scene): Promise<Zone1> {
    const z = new Zone1(scene);
    z.env = await buildZone1Environment(scene);
    z.world = z.env.world;
    z.debrisRoot = z.env.debrisRoot;

    z.debris.populate(85, 80);
    scene.add(z.debris.group);
    z.debris.group.name = 'salvageRoot';
    scene.add(z.drones.group);

    // Power cells at varied altitudes — reach-and-grab in 3D
    const cellSpots = [
      new THREE.Vector3(-8, 8, -38),
      new THREE.Vector3(14, -6, -48),
      new THREE.Vector3(4, 14, -28),
    ];
    for (let i = 0; i < 3; i++) {
      const p = cellSpots[i].clone().add(new THREE.Vector3(randRange(-2, 2), randRange(-1, 1), randRange(-2, 2)));
      const cell = createSalvage(p, 'legendary');
      const mat = cell.mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(0xfedd04);
      mat.emissive.setHex(0xfedd04);
      mat.emissiveIntensity = 0.65;
      cell.value = 0;
      (cell as SalvagePiece & { isPowerCell?: boolean }).isPowerCell = true;
      cell.mesh.name = `powerCell_${i}`;
      z.powerCells.push(cell);
      z.debris.pieces.push(cell);
      z.debris.group.add(cell.mesh);
    }

    scene.add(z.extractPad);
    scene.userData.zoneId = 'zone1-orbital-debris';
    // Zone 2 deferred — hook only
    scene.userData.nextZoneHook = null;
    return z;
  }

  isPowerCell(p: SalvagePiece) {
    return !!(p as SalvagePiece & { isPowerCell?: boolean }).isPowerCell;
  }

  onSalvageCollected(p: SalvagePiece) {
    if (this.isPowerCell(p)) {
      this.cellsCollected++;
      if (this.cellsCollected >= this.cellsNeeded && this.beat === 'collect') {
        this.beat = 'drones';
        this.drones.spawn(5, new THREE.Vector3(10, 4, -10), 26);
      }
    } else if (p.rarity === 'rare' || p.rarity === 'epic' || p.rarity === 'legendary') {
      this.raresCollected++;
    }
  }

  update(dt: number, shipPos: THREE.Vector3) {
    this.debris.update(dt);
    if (this.beat === 'intro' && shipPos.length() > 6) this.beat = 'collect';

    if (this.beat === 'drones' && this.drones.aliveCount() === 0) {
      this.beat = 'extract';
      this.extractPad.visible = true;
      // Behemoth ONLY after 3/3 cells (extract beat)
      if (!this.bossSpawned && this.cellsCollected >= this.cellsNeeded) {
        this.bossSpawned = true;
        this.boss = new JunkBehemoth(new THREE.Vector3(22, 8, 22));
        this.scene.add(this.boss.group);
        this.boss.group.name = 'junkBehemoth';
      }
    }

    if (this.boss && !this.boss.alive && !this.bossDefeated) {
      this.bossDefeated = true;
    }

    if (this.extractPad.visible) {
      (this.extractPad.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.4 + Math.sin(performance.now() * 0.005) * 0.25;
      this.extractPad.rotation.z += dt * 0.6;
      if (shipPos.distanceTo(this.extractPad.position) < 7) {
        this.extracted = true;
        this.beat = 'complete';
      }
    }
  }

  objectiveText(): { objective: string; progress: string } {
    switch (this.beat) {
      case 'intro':
      case 'collect':
        return { objective: 'Collect 3 Power Cells', progress: `${this.cellsCollected}/${this.cellsNeeded}` };
      case 'drones':
        return { objective: 'Clear scrap drones', progress: `${this.drones.aliveCount()} left` };
      case 'extract':
        return {
          objective: this.boss?.alive ? 'Reach Extraction (Behemoth optional)' : 'Reach Extraction Point',
          progress: 'Open',
        };
      case 'complete':
        return { objective: 'Mission Complete', progress: '✓' };
      default:
        return { objective: 'Explore', progress: '' };
    }
  }
}
