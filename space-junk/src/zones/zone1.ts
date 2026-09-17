import * as THREE from 'three';
import { DebrisField, createSalvage, type SalvagePiece } from '../entities/salvage';
import { DroneSwarm } from '../entities/drone';
import { JunkBehemoth } from '../entities/boss';
import { buildZone1Environment } from './environment';
import { randRange } from '../util/math';

export type MissionBeat =
  | 'intro'
  | 'collect'
  | 'drones'
  | 'extract'
  | 'complete';

/**
 * Zone 1 — Collect 3 Power Cells → extraction.
 * Optional: rare salvage + Junk Behemoth encounter.
 * Extension hook: scene.userData.nextZoneHook
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
  private bossSpawned = false;

  constructor(private scene: THREE.Scene) {
    buildZone1Environment(scene);
    this.debris.populate(70, 78);
    scene.add(this.debris.group);
    scene.add(this.drones.group);

    for (let i = 0; i < 3; i++) {
      const p = new THREE.Vector3(
        randRange(-12, 12),
        randRange(-4, 6),
        -42 + randRange(-8, 10),
      );
      const cell = createSalvage(p, 'legendary');
      const mat = cell.mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(0xfedd04);
      mat.emissive.setHex(0xfedd04);
      mat.emissiveIntensity = 0.5;
      cell.value = 0;
      (cell as SalvagePiece & { isPowerCell?: boolean }).isPowerCell = true;
      this.powerCells.push(cell);
      this.debris.pieces.push(cell);
      this.debris.group.add(cell.mesh);
    }

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
    this.extractPad.position.set(38, 0, 38);
    this.extractPad.visible = false;
    scene.add(this.extractPad);

    scene.userData.zoneId = 'zone1-orbital-debris';
    scene.userData.nextZoneHook = 'zones/zone2'; // deferred Zones 2–5
  }

  isPowerCell(p: SalvagePiece) {
    return !!(p as SalvagePiece & { isPowerCell?: boolean }).isPowerCell;
  }

  onSalvageCollected(p: SalvagePiece) {
    if (this.isPowerCell(p)) {
      this.cellsCollected++;
      if (this.cellsCollected >= this.cellsNeeded && this.beat === 'collect') {
        this.beat = 'drones';
        this.drones.spawn(5, new THREE.Vector3(10, 0, -10), 26);
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
      if (!this.bossSpawned) {
        this.bossSpawned = true;
        this.boss = new JunkBehemoth(new THREE.Vector3(20, 3, 20));
        this.scene.add(this.boss.group);
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
