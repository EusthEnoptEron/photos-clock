export function tween(startValue: number, endValue: number, durationMillis: number, applyFn: (number) => void): Promise<number> {
    return new Promise<number>(resolve => {
      const startTime = new Date().getTime();
      const diff = endValue - startValue;
    
      function update() {
        const t = (new Date().getTime() - startTime) / durationMillis;
        if(t >= 1) {
          applyFn(endValue);
          resolve(endValue);
          return;
        }
    
        applyFn(startValue + diff * t);
        requestAnimationFrame(update);
      }
    
      update();
    });
    
  }