import { GRID_SIZE } from '@/lib/game/engine/GameConfig';

export class Gem {
  x: number;
  y: number;
  value: number;
  element: HTMLElement;
  falling = false;
  isBomb = false; // thêm dòng này
  isLightGem: boolean = false;
  setBomb() {
    this.isBomb = true;
    this.element.classList.add('bomb');
    this.element.style.backgroundImage = `url("/images/sprites/bomb.png")`;

    // Đưa lên đầu stack hiển thị (nếu đã nằm trong DOM)
    const grid = document.getElementById('grid');
    if (grid && grid.contains(this.element)) {
      grid.appendChild(this.element); // bomb lên trên cùng DOM
    }
  }

  constructor(x: number, y: number, value: number, isLightGem?: boolean, isBomb?: boolean) {
    this.x = x;
    this.y = y;
    this.value = value;
    if (isBomb) {
      this.setBomb();
    }
    this.isLightGem = isLightGem || false;
    this.element = document.createElement('span');
    this.element.className = 'gem item';
    this.element.id = `tile${y}_${x}`;
    const cellPercent = 100 / GRID_SIZE;
    this.element.style.left = `${this.x * cellPercent}%`;
    this.element.style.top = `${this.y * cellPercent}%`;
    this.element.style.backgroundImage = `url("/images/sprites/${value}.png")`;
  }

  /**
   * Gắn vào DOM
   */
  pop(container: HTMLElement) {
    container.appendChild(this.element);
  }

  /**
   * So sánh với 1 gem khác (vị trí & loại giống nhau)
   */
  equals(other: Gem): boolean {
    return other && other.value === this.value && other !== this && !other.falling;
  }

  /**
   * Kiểm tra có phải hàng xóm gần không (lân cận theo lưới)
   */
  isNeighbour(other: Gem): boolean {
    return (
      (Math.abs(this.x - other.x) === 1 && this.y === other.y) ||
      (Math.abs(this.y - other.y) === 1 && this.x === other.x)
    );
  }

  /**
   * Xóa khỏi DOM kèm animation
   */
  destroy(onDone?: () => void) {
    const loops = 3;
    let i = 0;

    const animate = () => {
      if (i >= loops) {
        clearInterval(timer);
        this.element.remove();
        if (onDone) onDone();
        return;
      }
      this.element.style.backgroundImage = `url("/images/sprites/${this.value}_explosion${i % 2}.png")`;
      i++;
    };

    const timer = setInterval(animate, 100);
  }

  /**
   * Cập nhật vị trí trong DOM
   */
  updatePosition() {
    const cellPercent = 100 / GRID_SIZE;
    this.element.style.left = `${this.x * cellPercent}%`;
    this.element.style.top = `${this.y * cellPercent}%`;
  }

  highlight(active: boolean) {
    if (active) {
      this.element.classList.add('highlight');
    } else {
      this.element.classList.remove('highlight');
    }
  }
}

export type GemServer = {
  value: number;
  isBomb: boolean;
  isLightGem: boolean;
};
