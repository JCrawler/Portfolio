import { Scene3DController } from './scene3d.ts';
import { ScenePreset } from './scene3d-logic.ts';

export function initializePortfolio3D() {
  const heroMount = document.getElementById('hero-3d-mount');
  const modal = document.getElementById('scene3d-modal');
  const modalMount = document.getElementById('scene3d-modal-mount');
  const expandBtn = document.getElementById('expand-3d-btn');
  const nav3dBtn = document.getElementById('nav-3d-btn');
  const closeBtn = document.getElementById('dock-close-btn');
  const collapseBtn = document.getElementById('dock-collapse-btn');
  const dockBody = document.getElementById('scene3d-dock-body');
  const dockCollapseIcon = document.getElementById('dock-collapse-icon');
  const pulseBtn = document.getElementById('dock-pulse-btn');
  const wireframeBtn = document.getElementById('dock-wireframe-btn');
  const pauseBtn = document.getElementById('dock-pause-btn');
  const pauseText = document.getElementById('dock-pause-text');
  const themeToggle = document.getElementById('theme-toggle');

  if (!heroMount || !modal || !modalMount) return null;

  const mHeroMount = heroMount;
  const mModal = modal;
  const mModalMount = modalMount;

  // Initialize controller inside the hero card mount
  const controller = new Scene3DController(mHeroMount);

  // Sync initial theme
  const currentTheme = (document.documentElement.getAttribute('data-theme') || 'dark') as 'dark' | 'light';
  controller.updateTheme(currentTheme);

  // Theme change observer
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'data-theme') {
        const nextTheme = (document.documentElement.getAttribute('data-theme') || 'dark') as 'dark' | 'light';
        controller.updateTheme(nextTheme);
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true });

  // Fullscreen open/close handling
  function openFullscreen() {
    mModal.classList.add('open');
    mModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Move canvas into modal mount
    const canvas = mHeroMount.querySelector('.scene3d-canvas');
    if (canvas) {
      mModalMount.appendChild(canvas);
    }
    controller.setFullscreen(true);
  }

  function closeFullscreen() {
    mModal.classList.remove('open');
    mModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Move canvas back to hero card
    const canvas = mModalMount.querySelector('.scene3d-canvas');
    if (canvas) {
      mHeroMount.appendChild(canvas);
    }
    controller.setFullscreen(false);
  }

  expandBtn?.addEventListener('click', openFullscreen);
  nav3dBtn?.addEventListener('click', openFullscreen);
  closeBtn?.addEventListener('click', closeFullscreen);

  // Escape key to close fullscreen
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeFullscreen();
    }
  });

  // Dock Collapse Toggle
  let dockCollapsed = false;
  collapseBtn?.addEventListener('click', () => {
    dockCollapsed = !dockCollapsed;
    if (dockBody) {
      dockBody.style.display = dockCollapsed ? 'none' : 'flex';
    }
    if (dockCollapseIcon) {
      dockCollapseIcon.style.transform = dockCollapsed ? 'rotate(180deg)' : 'none';
    }
  });

  // Preset switching
  const presetPills = document.querySelectorAll('.dock-pill');
  presetPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      presetPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const presetKey = pill.getAttribute('data-preset') as ScenePreset;
      if (presetKey) {
        controller.applyPreset(presetKey);
      }
    });
  });

  // Pulse button
  pulseBtn?.addEventListener('click', () => {
    controller.triggerPulse();
  });

  // Wireframe button
  let wireframeState = false;
  wireframeBtn?.addEventListener('click', () => {
    wireframeState = !wireframeState;
    controller.setWireframe(wireframeState);
    wireframeBtn.classList.toggle('active', wireframeState);
  });

  // Pause button
  pauseBtn?.addEventListener('click', () => {
    const isPaused = controller.togglePause();
    if (pauseText) {
      pauseText.textContent = isPaused ? 'Resume' : 'Pause';
    }
    pauseBtn.classList.toggle('active', isPaused);
  });

  return controller;
}

// Auto-mount when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializePortfolio3D());
} else {
  initializePortfolio3D();
}
