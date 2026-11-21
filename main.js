// Lightsaber Plugin Entry Point
// Reuses yodaman's gitService.js and auditLog through api.deps. The lightsaber tool itself is lightsaber.js.
// Import mountRoutes to register Lightsaber API endpoints on yodaman's router.

module.exports = {
  name: 'lightsaber',

  async onLoad(api) {
    const logger = api.log || console;
    logger.info('[Lightsaber] Plugin loaded — reusing yodaman gitService and auditLog');

    // Register the plugin card in Plugins tab
    api.ui.registerPluginCard({
      id: 'lightsaber-card',
      component: './frontend/HealthDashboard.jsx',
      icon: './assets/lightsaber-icon.svg',
      label: 'Lightsaber — Git Health Map',
      description: 'Find hotspots using Git history, complexity, and coupling'
    });

    // Register keyboard shortcut
    api.ui.registerShortcut({
      id: 'lightsaber-open', keys: ['Ctrl', 'Shift', 'L'],
      action: () => api.ui.openModal('lightsaber-modal'),
      label: 'Open Lightsaber Health Map'
    });

    // Mount API routes — expects api.router to be yodaman's Express router
    if (api.router && api.deps) {
      const { mountRoutes } = require('./backend/routes');
      mountRoutes(api.router, api.deps);
      logger.info('[Lightsaber] API routes mounted (reuses gitService, auditLog from yodaman)');
    }
  },

  async onEnable(api) { api.log?.info('[Lightsaber] Plugin enabled'); },
  async onDisable(api) { api.ui?.unregisterShortcut('lightsaber-open'); api.log?.info('[Lightsaber] Plugin disabled'); },
  onUnload(api) { api.log?.info('[Lightsaber] Plugin unloaded'); }
};
