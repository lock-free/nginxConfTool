// TODO add validation to make sure configuration correctness

const _ = require('lodash');

const getNginxHttpConf = (cnf) => {
  return {
    upstreams: getNginxUpstreamConf(cnf.upstreams),
    servers: cnf.servers.join('\n')
  };
};

/**
 * {
 *   [name]: [{
 *      host string, eg "a.com:9999"
 *      options string, eg "weight=5"
 *   }]
 * }
 */
const getNginxUpstreamConf = (upstreamCnf) => {
  return _.map(upstreamCnf, (stream, streamName) => {
    const serverList = upstreamCnf[streamName].map(({
      host,
      options = ''
    }) => {
      return `    server ${host}${options? ` ${options}`: ''};`;
    });

    return `upstream ${streamName} {
${serverList.join('\n')}
}`;
  }).join('\n');
};

const httpServer = ({
  port = 80,
  root,
  serverName,
  locations,
  error404 = default404(),
  error50x = default50x()
}) => {
  return `
server {
    listen ${port};
    server_name ${serverName};
    ${root? `root ${root};`: ''}

    # Load configuration files for the default server block.
    include /etc/nginx/default.d/*.conf;

    ${locations.join('\n')}

    ${error404} 

    ${error50x} 
}
`;
};

const redirectServer = ({
  port = 80,
  serverName,
  targetHost
}) => {
  return `
server {
    listen ${port};
    server_name ${serverName};
    return 301 ${targetHost}$request_uri;
}
    `;
};

const httpsServer = ({
  sslCertificate,
  sslCertificateKey,
  port = 443,
  root,
  serverName,
  locations,
  error404 = default404(),
  error50x = default50x()

}) => {
  return `
server {
    listen ${port} ssl;
    ssl_certificate ${sslCertificate};
    ssl_certificate_key ${sslCertificateKey};
    ${root? `root ${root};`: ''}

    server_name ${serverName};

    # Load configuration files for the default server block.
    include /etc/nginx/default.d/*.conf;

    ${locations.join('\n')}

    ${error404} 

    ${error50x} 
}
`;
}

const default404 = () => {
  return `
    error_page 404 /404.html;
        location = /40x.html {
        root         /usr/share/nginx/html;
        internal;
    }
`;
};

const default50x = () => {
  return `
    error_page 500 502 503 504 /50x.html;
        location = /50x.html {
        root         /usr/share/nginx/html;
        internal;
    }
    `
};

const apiLocation = ({
  path,
  proxy,
  proxyConnectTimeout = 75,
  proxySendTimeout = 900,
  proxyReadTimeout = 900
}) => {
  return `
    location ${path} {
        add_header 'Cache-Control' 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
        expires off;
        proxy_connect_timeout      ${proxyConnectTimeout}s;
        proxy_send_timeout         ${proxySendTimeout}s;
        proxy_read_timeout         ${proxyReadTimeout}s;
        ${proxy}
    }
`
};

const getProxyPass = (variableName, proxyMap, defaultProxy) => {
  const prev = _.map(proxyMap, (proxy, vv) => {
    return `
        if ($${variableName} = ${vv}) {
            proxy_pass ${proxy};
        }`
  }).join('\n');

  return `${prev}
        proxy_pass ${defaultProxy};`
};

const rewriteLocation = (path, from, to, type = 'last') => {
  return `
    location ${path} {
        add_header 'Cache-Control' 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
        expires off;
        rewrite  ${from}  ${to} ${type};
    }
    `;
};

const staticFileLocation = (path, fileLocation) => {
  return `
    location = ${path} {
        try_files $uri ${fileLocation};
    }
    `;
};

const staticDirLocation = (path, dir) => {
  return `
    location ${path} {
        gzip on;
        gzip_types    text/plain application/javascript application/x-javascript text/javascript text/xml text/css;
        gzip_static on;
        gzip_vary on;
        gzip_min_length 10240;
        gzip_proxied expired no-cache no-store private auth;
        gzip_disable "MSIE [1-6]\.";
        expires max;

        ${dir} 
    }
    `;
};

const getDir = (variableName, dirMap, defDir) => {
  const prev = _.map(dirMap, (dir, vv) => {
    return `
        if ($${variableName} = ${vv}) {
            root ${dir};
        }`
  }).join('\n');

  return `${prev}
        alias ${defDir};`
};

const getFile = (variableName, rootMap, defFile) => {
  const prev = _.map(rootMap, (dir, vv) => {
    return `
        if ($${variableName} = ${vv}) {
            root ${dir};
        }`
  }).join('\n');

  return `
    location = / {
        add_header 'Cache-Control' 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
        expires off;
        rewrite  ^/$  /index.html  last;
    }

    location = /index.html {
       add_header 'Cache-Control' 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
       expires off;

       ${prev} 

       try_files $uri /campaign-ui/production/stage/index.html;
    }
    `;
};

const indexLocation = (indexFile, rootMap = {}) => {
  const prev = _.map(rootMap, (dir, vv) => {
    return `
        if ($${variableName} = ${vv}) {
            root ${dir};
        }`
  }).join('\n');

  return `
    location = / {
        add_header 'Cache-Control' 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
        expires off;
        rewrite  ^/$  /index.html  last;
    }

    location = /index.html {
       add_header 'Cache-Control' 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
       expires off;

       ${prev} 

       try_files $uri ${indexFile};
    }
    `;
};

module.exports = {
  getNginxHttpConf,

  httpServer,
  httpsServer,

  apiLocation,
  rewriteLocation,
  indexLocation,
  staticDirLocation,
  staticFileLocation,
  redirectServer,

  getProxyPass,
  getDir
};
