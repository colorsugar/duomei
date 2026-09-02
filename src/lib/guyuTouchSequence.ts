export function updateGuyuTouchSequence(
  multiTouch: boolean,
  activeTouchCount: number,
) {
  const blocksTurn = multiTouch || activeTouchCount >= 2;
  return {
    blocksTurn,
    multiTouch: activeTouchCount > 0 && blocksTurn,
  };
}
