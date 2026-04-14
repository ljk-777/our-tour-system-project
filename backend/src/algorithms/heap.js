/**
 * 算法模块：小顶堆 (Min-Heap)
 * 课程设计知识点：TopK 问题、优先队列
 * 用途：Dijkstra 最短路中的优先队列
 */
class MinHeap {
  constructor(compareFn) {
    this.data = [];
    // 默认按 .dist 字段比较，也可传入自定义比较函数
    this.compare = compareFn || ((a, b) => a.dist - b.dist);
  }

  get size() { return this.data.length; }
  isEmpty() { return this.data.length === 0; }

  // 插入元素
  push(item) {
    this.data.push(item);
    this._siftUp(this.data.length - 1);
  }

  // 弹出堆顶（最小值）
  pop() {
    if (this.isEmpty()) return null;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  // 查看堆顶（不移除）
  peek() { return this.data[0] || null; }

  // 上浮（新插入元素）
  _siftUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.compare(this.data[i], this.data[parent]) < 0) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }

  // 下沉（移除堆顶后）
  _siftDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.compare(this.data[l], this.data[smallest]) < 0) smallest = l;
      if (r < n && this.compare(this.data[r], this.data[smallest]) < 0) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}

/**
 * TopK 算法：从数组中取出评分最高的 K 个景点
 * 课程设计知识点：小顶堆实现 TopK（复杂度 O(n log k)）
 */
function topK(items, k, keyFn = (x) => x.rating) {
  // 使用小顶堆维护 K 个最大值
  const heap = new MinHeap((a, b) => keyFn(a) - keyFn(b));
  for (const item of items) {
    if (heap.size < k) {
      heap.push(item);
    } else if (keyFn(item) > keyFn(heap.peek())) {
      heap.pop();
      heap.push(item);
    }
  }
  // 堆中元素按升序输出，逆转得到降序
  return heap.data.sort((a, b) => keyFn(b) - keyFn(a));
}

module.exports = { MinHeap, topK };
