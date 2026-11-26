// Layar Game Over dengan skor akhir, high score, dan tombol Main Lagi.
export function createGameOverScreen(onRestart) {
  const gameOverEl = document.getElementById('game-over');
  const finalScoreEl = document.getElementById('final-score');
  const highScoreEl = document.getElementById('high-score');
  const restartBtn = document.getElementById('restart-btn');

  restartBtn.addEventListener('click', () => {
    if (onRestart) onRestart();
  });

  return {
    show(score, highScore) {
      finalScoreEl.textContent = String(score);
      highScoreEl.textContent = String(highScore);
      gameOverEl.classList.add('active');
    },
    hide() {
      gameOverEl.classList.remove('active');
    }
  };
}
