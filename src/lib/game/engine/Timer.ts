import { get } from '../utils/dom';
import { INITIAL_TIMER_MINUTES } from './GameConfig';

export class Timer {
  private totalTime: number; // Tổng thời gian (ms)
  private remaining: number; // Thời gian còn lại (ms)
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private updateCallback: () => void;
  private timeoutCallback: () => void;

  constructor(minutes = INITIAL_TIMER_MINUTES, onUpdate: () => void = () => {}, onTimeout: () => void = () => {}) {
    this.totalTime = minutes * 60 * 1000;
    this.remaining = this.totalTime;
    this.updateCallback = onUpdate;
    this.timeoutCallback = onTimeout;
  }

  getTime() {
    return this.remaining;
  }

  /**
   * Bắt đầu đồng hồ đếm ngược
   */
  start() {
    this.intervalId = setInterval(() => {
      this.remaining -= 50;

      if (this.remaining <= 0) {
        this.stop();
        this.timeoutCallback();
        return;
      }

      this.updateGauge();
      this.updateCallback();
    }, 50);
  }

  /**
   * Cập nhật đồng hồ hiển thị
   */
  private updateGauge() {
    if (this.remaining % 1000 !== 0) return; // mỗi 1 giây

    const percent = (this.remaining * 100) / this.totalTime;
    const gauge = get('#current_gauge') as HTMLElement;
    if (gauge) gauge.style.height = `${percent}%`;
  }

  /**
   * Dừng timer
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  pause() {
    this.stop();
  }

  resume() {
    if (!this.intervalId && this.remaining > 0) {
      this.start();
    }
  }

  /**
   * Reset timer về ban đầu
   */
  reset() {
    this.stop();
    this.remaining = this.totalTime;
    this.updateGauge();
  }
}
