const {
  httpServer,
  httpsServer,
  redirectServer,

  apiLocation,
  rewriteLocation,
  indexLocation,
  staticDirLocation,
  staticFileLocation,

  getProxyPass,
  getDir
} = require('..');

module.exports = {
  upstreams: {
    testStream: [{
      host: '127.0.0.1:9877'
    }, {
      host: '127.0.0.1:9878'
    }]
  },

  servers: [redirectServer({
    port: 80,
    serverName: 'a.com',
    targetHost: 'https://a.com'
  }), httpsServer({
    sslCertificate: '/a/b',
    sslCertificateKey: 'a.key',

    serverName: 'a.com',
    locations: [
      rewriteLocation('/', '^/$', '/home'),

      apiLocation({
        path: '/api',
        proxy: getProxyPass('abtest_country', {
          'yes': 'http://testStream'
        }, 'http://online')
      }),

      indexLocation('/home', '/index.html'),

      staticDirLocation('/assets/', getDir('abtest_country', {
        'yes': '/stage'
      }, '/assets/')),

      staticFileLocation('/fav.ico', '/fav.ico'),
    ]
  })]
};
