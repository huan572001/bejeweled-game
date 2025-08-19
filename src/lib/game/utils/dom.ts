/**
 * Tìm phần tử DOM bằng selector. Trả về 1 phần tử hoặc danh sách.
 */
export function get(selector: string): Element | NodeListOf<Element> | null {
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) return null;
  if (elements.length === 1) return elements[0];
  return elements;
}

/**
 * Xóa một phần tử DOM khỏi cây DOM nếu tồn tại
 */
export function remove(elem: Element) {
  if (elem.parentNode) {
    elem.parentNode.removeChild(elem);
  }
}

/**
 * Đếm số lượng thuộc tính trong một object
 */
export function getLength(obj: Record<string, any>): number {
  return Object.keys(obj).length;
}

/**
 * So sánh 2 mảng 1 chiều
 */
export function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}
