// Lightsaber Plugin Entry Point
// Reuses yodaman's gitService.js, auditLog, and Express router pattern.
// Import mountRoutes to register Lightsaber API endpoints on yodaman's router.

const path = require('path');

module.exports = {
  name: 'lightsaber',

  async onLoad(api) {
    const logger = api.log || console;
    logger.info('[Lightsaber] Plugin loaded — reusing yodaman gitService, auditLog, ToolBox');

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

    // Register as a tool in yodaman's ToolBox
    if (api.registerTool) {
      api.registerTool({
        name: 'lightsaber_find_hotspots',
        description: 'Analyze Git history to find code hotspots (frequently changed + complex files)',
        permissions: ['git:read', 'filesystem:read'],
        parameters: {
          workspacePath: 'Absolute path to the Git repository',
          commitLimit: 'Max commits to analyze (default 500)',
          daysToAnalyze: 'Time window in days (default 90)'
        },
        async execute(params) {
          const { mountRoutes } = require('./backend/routes');
          const express = require('express');
          const router = express.Router();
          // Use yodaman's gitService directly
          const deps = {
            gitService: require(path.join(api.rootDir, 'backend/services/gitService')),
            auditLog: api.deps?.auditLog,
            logger: api.log
          };
          mountRoutes(router, deps);
          // Simulate request via the route
          const httpMocks = require('node-mocks-http');
          const req = httpMocks.createRequest({ method: 'POST', body: params });
          const res = httpMocks.createResponse();
          await router.handle(req, res);
          return JSON.parse(res._getData());
        }
      });
      logger.info('[Lightsaber] Registered as YodaMan tool: lightsaber_find_hotspots');
    }
  },

  async onEnable(api) { api.log?.info('[Lightsaber] Plugin enabled'); },
  async onDisable(api) { api.ui?.unregisterShortcut('lightsaber-open'); api.log?.info('[Lightsaber] Plugin disabled'); },
  onUnload(api) { api.log?.info('[Lightsaber] Plugin unloaded'); }
};
