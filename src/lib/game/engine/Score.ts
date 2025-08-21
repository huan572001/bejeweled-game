import { get } from '../utils/dom';
import { store } from '@/store';
import { addScore } from '@/store/scoreSlice';

export class Score {
  current: number;
  goal: number;
  level: number;
  combo = 0;
  pointComboStart = 0;
  pointComboEnd = 0;
  private yOrigin = 215;
  private yShift = 5;

  constructor(initialGoal: number) {
    this.current = 0;
    this.goal = initialGoal;
    this.level = 1; // Mức độ hiện tại
  }

  /**
   * Tăng điểm dựa trên số gem bị phá và combo
   */
  add(destroyedGems: number, comboReward: number = 0, bonus: number = 0) {
    let gain = destroyedGems * (10 + bonus) + comboReward;
    this.current += gain;
    this.displayGainAnimation(gain);
    store.dispatch(addScore(this.current));
  }

  /**
   * Tăng độ khó và reset điểm cho level mới
   */
  nextLevel() {
    if (this.current >= this.goal) {
      this.current = 0;
      this.combo = 0;
      this.goal = Math.floor(this.goal * 1.5);
      this.level += 1;
      return true; // Đạt được level mới
    }
    return false;
  }

  /**
   * Hiển thị hiệu ứng +score
   */
  reset(initialGoal: number) {
    this.current = 0;
    this.goal = initialGoal;
    this.level = 1;
  }

  private displayGainAnimation(amount: number) {
    const container = get('#player_info') as HTMLElement;
    if (!container) return;

    const existing = get('.score_gain');
    if (existing instanceof HTMLElement) {
      container.removeChild(existing);
    } else if (existing instanceof NodeList) {
      existing.forEach((el) => container.removeChild(el));
    }

    const span = document.createElement('span');
    span.className = 'score_gain';
    span.innerHTML = `+${amount}`;
    span.style.top = `${this.yOrigin}px`;
    const reference = get('#total_score');
    if (reference instanceof Node) {
      container.insertBefore(span, reference);
    } else {
      container.appendChild(span); // fallback nếu không có #total_score
    }

    const interval = setInterval(() => {
      const y = parseInt(span.style.top);
      if (y >= this.yOrigin + 35) {
        clearInterval(interval);
        span.remove();
      } else {
        span.style.top = `${y + this.yShift}px`;
      }
    }, 60);
  }
}
