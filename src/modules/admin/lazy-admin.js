// ═══════════════════════════════════════════════════════════
// lazy-admin.js — Load admin feature scripts only for admin roles
// Keeps initial parse + download smaller for employees & login.
// ═══════════════════════════════════════════════════════════

(function () {
  var _promise = null;
  var _done = false;

  var ADMIN_SCRIPTS = [
    './src/modules/admin/admin.ui.js',
    './src/modules/admin/dashboard.js',
    './src/modules/admin/employees.js',
    './src/modules/admin/admins.js',
    './src/modules/admin/branches.js',
    './src/modules/admin/targets.js',
    './src/modules/admin/reports.ui.js',
    './src/modules/admin/reports.js',
    './src/modules/admin/visits.js',
    './src/modules/admin/display.js',
  ];

  function _q() {
    var v = typeof window.__ASSET_VER__ === 'string' ? window.__ASSET_VER__ : '17';
    return '?v=' + encodeURIComponent(v);
  }

  function _loadOne(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src + _q();
      s.async = false;
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        reject(new Error('Failed to load ' + src));
      };
      document.head.appendChild(s);
    });
  }

  window.lazyLoadAdminModules = function () {
    if (_done) return Promise.resolve();
    if (_promise) return _promise;
    _promise = ADMIN_SCRIPTS.reduce(function (chain, src) {
      return chain.then(function () {
        return _loadOne(src);
      });
    }, Promise.resolve())
      .then(function () {
        _done = true;
        _promise = null;
      })
      .catch(function (e) {
        _promise = null;
        throw e;
      });
    return _promise;
  };
})();
