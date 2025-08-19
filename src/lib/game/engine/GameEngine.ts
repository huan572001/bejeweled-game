import { GRID_SIZE, GEM_TYPES, INITIAL_SCORE_GOAL } from './GameConfig';
import { Gem } from '../model/Gem';
import { Score } from './Score';
import { Timer } from './Timer';
import { get } from '../utils/dom';
const TEST_MAP: number[][] = [
  [5, 2, 3, 4, 5, 6, 7, 1],
  [6, 1, 3, 4, 5, 6, 7, 2],
  [2, 1, 5, 2, 3, 7, 1, 3],
  [1, 2, 1, 5, 5, 6, 7, 4],
  [2, 1, 3, 2, 5, 6, 7, 5],
  [1, 4, 1, 1, 4, 6, 2, 6],
  [7, 6, 5, 1, 3, 2, 7, 7],
  [7, 6, 5, 4, 3, 2, 1, 1],
];
export class GameEngine {
  grid: Gem[][] = [];
  selectedGem: Gem | null = null;
  score: Score;
  timer: Timer;
  comboReward: number = 100;
  combo = 0;
  paused = false;
  hoveredGem: Gem | null = null;
  activeDestroy: boolean = false;

  constructor() {
    this.score = new Score(INITIAL_SCORE_GOAL);
    this.timer = new Timer(
      1,
      () => this.onTick(),
      () => this.onTimeUp()
    );
  }

  init() {
    this.createGrid();
    // this.score.reset();
    this.timer.start();
    this.bindEvents();
  }
  setHoveredGem(gem: Gem) {
    if (this.activeDestroy) {
      this.hoveredGem = gem;
      this.uiTriggerSquareFromTopLeft(gem.x, gem.y, 4);
    }
  }
  createGrid(useTestMap = false) {
    const gridEl = get('#grid') as HTMLElement;
    this.grid = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      const row: Gem[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        let gem: Gem;
        if (useTestMap) {
          // Lấy loại từ map test
          gem = new Gem(x, y, TEST_MAP[y][x]);
        } else {
          // Sinh ngẫu nhiên nhưng tránh streak ban đầu
          do {
            gem = new Gem(x, y, Math.floor(Math.random() * GEM_TYPES));
          } while (this.hasInitialStreak(gem, row, y));
        }
        // do {
        //   gem = new Gem(x, y, Math.floor(Math.random() * GEM_TYPES));
        // } while (this.hasInitialStreak(gem, row, y));
        gem.pop(gridEl);
        row.push(gem);
      }
      this.grid.push(row);
    }
  }

  private hasInitialStreak(gem: Gem, row: Gem[], y: number): boolean {
    if (row.length >= 2 && row[row.length - 1].value === gem.value && row[row.length - 2].value === gem.value)
      return true;
    if (
      y >= 2 &&
      this.grid[y - 1][row.length]?.value === gem.value &&
      this.grid[y - 2][row.length]?.value === gem.value
    )
      return true;
    return false;
  }

  bindEvents() {
    const gridEl: any = get('#grid')!;
    gridEl.addEventListener('click', (e: any) => {
      const target = e.target as HTMLElement;
      const gem = this.findGemByElement(target);
      if (gem) {
        if (this.activeDestroy) {
          this.triggerSquareFromTopLeft(gem, 4);
          this.setActiveDestroy(false);
        } else {
          this.handleGemClick(gem);
        }
      }
    });
    gridEl.addEventListener('mouseover', (e: any) => {
      const target = e.target as HTMLElement;
      const gem = this.findGemByElement(target);
      if (gem && this.activeDestroy) this.uiTriggerSquareFromTopLeft(gem.x, gem.y, 4);
    });
  }
  setActiveDestroy(value: boolean) {
    this.activeDestroy = value;
  }
  handleGemClick(gem: Gem) {
    // if (gem.isBomb) {
    //     this.triggerBomb(gem);
    //     this.deselectGem();
    //     return;
    // }

    if (!this.selectedGem) {
      this.selectGem(gem);
      return;
    }

    if (gem === this.selectedGem) {
      this.deselectGem();
      return;
    }

    if (!gem.isNeighbour(this.selectedGem)) {
      this.selectGem(gem);
      return;
    }

    const g1 = this.selectedGem;
    const g2 = gem;

    // Bomb + Bomb => clear board
    if (g1.isBomb && g2.isBomb) {
      this.handleBombAndBomb(g1, g2);
      return;
    }
    // Bomb + Gem / Light Gem
    if (g1.isBomb || g2.isBomb) {
      this.handleBombAndGem(g1, g2);
      return;
    }
    // Light Gem + Light Gem
    if (g1.isLightGem && g2.isLightGem) {
      this.handleLightGemAndLightGem(g1, g2);
      return;
    }

    // // Light Gem + Normal Gem
    // if (g1.isLightGem || g2.isLightGem) {
    //   this.handleLightGemWithNormalGem(g1, g2);
    //   return;
    // }

    this.swapGems(g1, g2);

    const s1 = this.getStreakFrom(g1);
    const s2 = this.getStreakFrom(g2);

    // ✅ Kiểm tra lightGem trong streak
    const streakGems = Object.values(s1).flat().concat(Object.values(s2).flat());
    const lightGem = streakGems.find((g) => g.isLightGem);

    if (lightGem) {
      this.triggerLightGemExplosion(lightGem, g1.y === g2.y ? 'horizontal' : 'vertical');
      this.deselectGem();
    }

    if (Object.keys(s1).length > 0 || Object.keys(s2).length > 0) {
      this.combo = 1;
      const streakToRemove = Object.keys(s1).length > 0 ? s1 : s2;
      this.removeStreak(streakToRemove);
    } else {
      this.swapGems(g1, g2);
    }

    this.deselectGem();
  }
  private handleBombAndGem(g1: Gem, g2: Gem) {
    // Bomb + Light Gem => clear 3 rows & 3 cols
    if (g1.isLightGem || g2.isLightGem) {
      this.swapGems(g1, g2);
      const cx = g1.x;
      const cy = g1.y;
      const affected = new Set<Gem>();

      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        if (x < 0 || x >= GRID_SIZE) continue;
        for (let y = 0; y < GRID_SIZE; y++) {
          affected.add(this.grid[y][x]);
        }
      }

      for (let dy = -1; dy <= 1; dy++) {
        const y = cy + dy;
        if (y < 0 || y >= GRID_SIZE) continue;
        for (let x = 0; x < GRID_SIZE; x++) {
          affected.add(this.grid[y][x]);
        }
      }

      const gems = Array.from(affected);
      const streakMap: Record<number, Gem[]> = {};
      gems.forEach((g) => {
        if (!streakMap[g.x]) streakMap[g.x] = [];
        streakMap[g.x].push(g);
      });

      gems.forEach((gem, idx) => {
        const isLast = idx === gems.length - 1;
        gem.destroy(() => {
          if (isLast) {
            this.score.add(gems.length, this.comboReward, 0);
            this.onStreakRemoved(streakMap);
          }
        });
      });

      this.deselectGem();
      return;
    }

    // Bomb + Gem => clear all gems with same value
    const targetColor = g1.isBomb ? g2.value : g1.value;
    const gems: Gem[] = [];
    const streakMap: Record<number, Gem[]> = {};

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const gem = this.grid[y][x];
        if (gem.value === targetColor) {
          gems.push(gem);
          if (!streakMap[x]) streakMap[x] = [];
          streakMap[x].push(gem);
        }
      }
    }
    if (!gems.includes(g1)) {
      gems.push(g1);
      if (!streakMap[g1.x]) streakMap[g1.x] = [];
      streakMap[g1.x].push(g1);
    }
    if (!gems.includes(g2)) {
      gems.push(g2);
      if (!streakMap[g2.x]) streakMap[g2.x] = [];
      streakMap[g2.x].push(g2);
    }

    gems.forEach((gem, idx) => {
      const isLast = idx === gems.length - 1;
      gem.destroy(() => {
        if (isLast) {
          this.score.add(gems.length, this.comboReward, 0);
          this.onStreakRemoved(streakMap);
        }
      });
    });

    this.deselectGem();
  }
  private handleBombAndBomb(g1: Gem, g2: Gem) {
    this.swapGems(g1, g2);
    const all: Gem[] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        all.push(this.grid[y][x]);
      }
    }

    all.forEach((gem, idx) => {
      const isLast = idx === all.length - 1;
      gem.destroy(() => {
        if (isLast) {
          this.score.add(all.length, this.comboReward, 0);
          this.createGrid(false);
        }
      });
    });

    this.deselectGem();
  }

  private handleLightGemAndLightGem(g1: Gem, g2: Gem) {
    this.swapGems(g1, g2);

    const row = g1.y; // xóa hàng ngang theo gem 1
    const col = g1.x; // xóa hàng dọc theo gem 1
    const targets: Gem[] = [];

    // Hàng ngang
    for (let x = 0; x < GRID_SIZE; x++) {
      targets.push(this.grid[row][x]);
    }

    // Hàng dọc
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!targets.includes(this.grid[y][col])) {
        targets.push(this.grid[y][col]);
      }
    }
    const streakMap: Record<number, Gem[]> = {};
    for (const g of targets) {
      if (!streakMap[g.x]) streakMap[g.x] = [];
      streakMap[g.x].push(g);
    }
    targets.forEach((gem, idx) => {
      const isLast = idx === targets.length - 1;
      gem.destroy(() => {
        if (isLast) {
          this.score.add(targets.length, this.comboReward, 0);
          this.onStreakRemoved(streakMap);
        }
      });
    });

    this.deselectGem();
  }

  selectGem(gem: Gem) {
    this.deselectGem();
    this.selectedGem = gem;
    gem.element.classList.add('selected');
  }

  deselectGem() {
    if (this.selectedGem) {
      this.selectedGem.element.classList.remove('selected');
      this.selectedGem = null;
    }
  }

  swapGems(g1: Gem, g2: Gem) {
    [g1.x, g2.x] = [g2.x, g1.x];
    [g1.y, g2.y] = [g2.y, g1.y];

    this.grid[g1.y][g1.x] = g1;
    this.grid[g2.y][g2.x] = g2;

    g1.updatePosition();
    g2.updatePosition();
  }

  triggerBomb(gem: Gem) {
    const x = gem.x;
    const y = gem.y;
    const colGems = this.grid.map((row) => row[x]).filter((g) => g && g !== gem);
    const rowGems = this.grid[y].filter((g) => g && g !== gem);
    const allGems = [...colGems, ...rowGems];

    const streakMap: Record<number, Gem[]> = {};
    for (const g of allGems) {
      if (!streakMap[g.x]) streakMap[g.x] = [];
      streakMap[g.x].push(g);
    }

    gem.destroy(() => {
      this.grid[y][x] = null as any;
      this.onStreakRemoved(streakMap);
    });
  }

  triggerLightGemExplosion(lightGem: Gem, direction: 'horizontal' | 'vertical') {
    const targets: Gem[] = [];
    if (direction === 'vertical') {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!targets.includes(this.grid[y][lightGem.x])) {
          targets.push(this.grid[y][lightGem.x]);
        }
      }
    } else {
      for (let x = 0; x < GRID_SIZE; x++) {
        targets.push(this.grid[lightGem.y][x]);
      }
    }

    const streakMap: Record<number, Gem[]> = {};
    for (const g of targets) {
      if (!streakMap[g.x]) streakMap[g.x] = [];
      streakMap[g.x].push(g);
    }
    targets.forEach((gem, idx) => {
      const isLast = idx === targets.length - 1;
      gem.destroy(() => {
        if (isLast) {
          this.score.add(targets.length, this.comboReward, 0);
          this.onStreakRemoved(streakMap);
        }
      });
    });

    this.deselectGem();
  }

  private checkTL = (streak: Gem[]) => {
    if (streak.length < 5) return false;
    let countX = 0;
    let countY = 0;
    const firstGem = streak[0];
    streak.forEach((gem) => {
      if (firstGem.x === gem.x) countX++;
      if (firstGem.y === gem.y) countY++;
    });
    if (countX >= 5 || countY >= 5) return true;
    return false;
  };

  removeStreak(streak: Record<number, Gem[]>) {
    const allGems: Gem[] = [];
    for (const col in streak) {
      allGems.push(...streak[col]);
    }

    let bombGem: Gem | null = null;
    let lightGem: Gem | null = null;

    // ✅ Nếu match 5 → tạo bomb
    if (allGems.length >= 5) {
      bombGem = allGems[0];
      this.winBomb(bombGem);
    }

    // ✅ Nếu match 4 → tạo lightGem
    else if (allGems.length === 4) {
      lightGem = allGems[0];
      lightGem.isLightGem = true;
      lightGem.element.classList.add('light'); // CSS glow effect
      // ❗ LOẠI lightGem khỏi streak để không bị phá ngay
      for (const col in streak) {
        streak[col] = streak[col].filter((g) => g !== lightGem);
        if (streak[col].length === 0) delete streak[col];
      }
    }

    const gemsToDestroy = allGems.filter((g) => g !== bombGem && g !== lightGem);

    if (gemsToDestroy.length === 0) {
      // Không còn gem để phá → vẫn check tiếp
      this.onStreakRemoved(streak);
      return;
    }
    const bonus = this.checkTL(allGems) ? 5 : 0;
    gemsToDestroy.forEach((gem, index) => {
      const isLast = index === gemsToDestroy.length - 1;
      gem.destroy(() => {
        if (isLast) {
          this.score.add(allGems.length, 0, bonus);
          this.onStreakRemoved(streak);
        }
      });
    });
  }

  winBomb(fromGem: Gem) {
    const x = fromGem.x;
    const y = fromGem.y;
    const gridEl = document.getElementById('grid');
    this.grid[y][x].element.remove();

    const bombGem = new Gem(x, y, Math.floor(Math.random() * GEM_TYPES));
    bombGem.isBomb = true;
    bombGem.value = -1; // Đặt giá trị đặc biệt cho bomb tránh lỗi đã là boom vẫn ghép đc
    bombGem.element.classList.add('bomb');
    bombGem.element.style.backgroundImage = `url("/images/sprites/bomb.png")`;

    if (gridEl) {
      gridEl.appendChild(bombGem.element);
    }

    this.grid[y][x] = bombGem;
  }

  showHint(): [Gem, Gem] | null {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const gem = this.grid[y][x];

        const neighbors = [this.grid[y]?.[x + 1], this.grid[y + 1]?.[x]].filter((g) => g);

        for (const neighbor of neighbors) {
          this.swapLogic(gem, neighbor!);

          const streak1 = this.getStreakFrom(gem);
          const streak2 = this.getStreakFrom(neighbor!);

          this.swapLogic(gem, neighbor!); // undo

          if (Object.keys(streak1).length > 0 || Object.keys(streak2).length > 0) {
            return [gem, neighbor!];
          }
        }
      }
    }

    return null;
  }

  triggerSquareFromTopLeft(gem: Gem, size: number) {
    const x = gem.x;
    const y = gem.y;

    const allGems: Gem[] = [];

    // duyệt theo size x size từ vị trí gem
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const nx = x + dx;
        const ny = y + dy;

        if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE) {
          const target = this.grid[ny][nx];
          if (target) {
            allGems.push(target);
          }
        }
      }
    }

    const streakMap: Record<number, Gem[]> = {};
    for (const g of allGems) {
      if (!streakMap[g.x]) streakMap[g.x] = [];
      streakMap[g.x].push(g);
    }

    allGems.forEach((gem, idx) => {
      const isLast = idx === allGems.length - 1;
      gem.destroy(() => {
        if (isLast) {
          this.onStreakRemoved(streakMap);
        }
      });
    });
  }

  private swapLogic(g1: Gem, g2: Gem) {
    const [x1, y1] = [g1.x, g1.y];
    const [x2, y2] = [g2.x, g2.y];

    [g1.x, g2.x] = [x2, x1];
    [g1.y, g2.y] = [y2, y1];

    this.grid[y1][x1] = g2;
    this.grid[y2][x2] = g1;
  }

  onStreakRemoved(streak: Record<number, Gem[]>) {
    const gridEl = get('#grid') as HTMLElement;
    const columns = Object.keys(streak).map(Number);

    columns.forEach((col, index) => {
      setTimeout(() => {
        this.processColumnFall(col, streak[col], gridEl);
      }, index * 100); // delay mỗi cột 100ms để chuyển động mượt
    });

    // Gọi check sau cùng sau tất cả delay
    setTimeout(
      () => {
        this.checkAllStreaks();
      },
      columns.length * 100 + 300
    );
  }

  private processColumnFall(col: number, destroyedGems: Gem[], gridEl: HTMLElement) {
    const columnGems: Gem[] = [];

    // Lấy các gem chưa bị phá
    for (let y = GRID_SIZE - 1; y >= 0; y--) {
      const gem = this.grid[y][col];
      if (gem && !destroyedGems.includes(gem)) {
        columnGems.unshift(gem);
      }
    }

    // Xoá cột khỏi grid
    for (let y = 0; y < GRID_SIZE; y++) {
      this.grid[y][col] = null as any;
    }

    // Đặt lại vị trí gem cũ
    let targetRow = GRID_SIZE - columnGems.length;
    for (let i = 0; i < columnGems.length; i++) {
      const gem = columnGems[i];
      gem.y = targetRow + i;
      gem.updatePosition();
      this.grid[gem.y][col] = gem;
    }

    // Tạo gem mới ở trên cùng
    for (let y = 0; y < GRID_SIZE - columnGems.length; y++) {
      const newGem = new Gem(col, y, Math.floor(Math.random() * GEM_TYPES));
      newGem.pop(gridEl);
      this.grid[y][col] = newGem;
    }
  }

  generateGems() {
    const gridEl = document.getElementById('grid');
    if (!gridEl) return;
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const gem = this.grid[y][x];
        if (!gem) {
          const newGem = new Gem(x, y, Math.floor(Math.random() * GEM_TYPES));
          this.grid[y][x] = newGem;
          newGem.pop(gridEl);
        }
      }
    }
  }

  onTick() {
    if (this.paused) return;
  }

  onTimeUp() {
    if (this.score.nextLevel()) {
      this.timer.reset();
      this.timer.start();
    } else {
      alert("Time's up! Game over.");
      this.pause();
    }
  }

  pause() {
    this.paused = true;
    this.timer.pause();
  }

  resume() {
    this.paused = false;
    this.timer.resume();
  }

  findGemByElement(el: HTMLElement): Gem | null {
    for (const row of this.grid) {
      for (const gem of row) {
        if (gem.element === el) return gem;
      }
    }
    return null;
  }

  restart() {
    const gridEl = get('#grid') as HTMLElement;
    gridEl.innerHTML = '';
    this.combo = 0;
    this.grid = [];
    this.selectedGem = null;
    this.createGrid(false);
    this.score.reset(INITIAL_SCORE_GOAL);
    this.timer.reset();
    this.timer.start();
  }

  shuffle() {
    const gridEl = get('#grid') as HTMLElement;
    gridEl.innerHTML = '';
    this.combo = 0;
    this.grid = [];
    this.selectedGem = null;
    this.createGrid(false);
  }
  destroyRandomGems() {
    const count = 6;
    const all: Gem[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        all.push(this.grid[y][x]);
      }
    }

    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }

    const selected = all.slice(0, count);

    const streakMap: Record<number, Gem[]> = {};
    selected.forEach((g) => {
      if (!streakMap[g.x]) streakMap[g.x] = [];
      streakMap[g.x].push(g);
    });

    selected.forEach((gem, idx) => {
      const isLast = idx === selected.length - 1;
      gem.destroy(() => {
        if (isLast) {
          this.onStreakRemoved(streakMap);
        }
      });
    });
  }

  checkAllStreaks() {
    let found = false;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const gem = this.grid[y][x];
        if (gem) {
          const streak = this.getStreakFrom(gem);
          if (Object.keys(streak).length > 0) {
            this.combo++;
            this.removeStreak(streak);
            found = true;
            return; // đợi removeStreak xong rồi gọi lại sau
          }
        }
      }
    }

    if (!found) {
      this.combo = 0; // kết thúc combo
    }
  }

  getStreakFrom(gem: Gem): Record<number, Gem[]> {
    const horizontal = [gem];
    const vertical = [gem];

    let i = gem.x - 1;
    while (i >= 0 && this.grid[gem.y][i].value === gem.value) {
      horizontal.unshift(this.grid[gem.y][i]);
      i--;
    }
    i = gem.x + 1;
    while (i < GRID_SIZE && this.grid[gem.y][i].value === gem.value) {
      horizontal.push(this.grid[gem.y][i]);
      i++;
    }

    i = gem.y - 1;
    while (i >= 0 && this.grid[i][gem.x].value === gem.value) {
      vertical.unshift(this.grid[i][gem.x]);
      i--;
    }
    i = gem.y + 1;
    while (i < GRID_SIZE && this.grid[i][gem.x].value === gem.value) {
      vertical.push(this.grid[i][gem.x]);
      i++;
    }

    const result: Record<number, Gem[]> = {};
    if (horizontal.length >= 3) {
      for (const g of horizontal) {
        if (!result[g.x]) result[g.x] = [];
        result[g.x].push(g);
      }
    }
    if (vertical.length >= 3) {
      for (const g of vertical) {
        if (!result[g.x]) result[g.x] = [];
        if (!result[g.x].includes(g)) result[g.x].push(g);
      }
    }
    return result;
  }

  uiTriggerSquareFromTopLeft(x: number, y: number, size: number) {
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.grid[row].length; col++) {
        const inSquare = row >= y && row < y + size && col >= x && col < x + size;

        this.grid[row][col].highlight(inSquare);
      }
    }
  }
}
