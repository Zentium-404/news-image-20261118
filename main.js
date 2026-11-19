const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Simple GitHub-compatible git forge
const PORT = 3000;

// Git operations
class GitForge {
  constructor() {
    this.repos = new Map();
    this.initRepo('test-repo');
  }

  initRepo(name) {
    const repoPath = path.join(__dirname, 'repos', name);
    if (!fs.existsSync(repoPath)) {
      fs.mkdirSync(repoPath, { recursive: true });
      fs.mkdirSync(path.join(repoPath, 'objects'), { recursive: true });
      fs.mkdirSync(path.join(repoPath, 'refs'), { recursive: true });
      fs.writeFileSync(path.join(repoPath, 'HEAD'), 'ref: refs/heads/main\n');
      this.repos.set(name, repoPath);
    }
  }

  handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(p => p);

    if (req.method === 'GET' && url.pathname === '/api/v1/repos') {
      // List repos
      const repos = Array.from(this.repos.keys()).map(name => ({
        id: name,
        name: name,
        full_name: `user/${name}`,
        description: 'GitHub-compatible git forge',
        private: false,
        html_url: `http://localhost:${PORT}/${name}`,
        clone_url: `http://localhost:${PORT}/${name}.git`,
        ssh_url: `git@localhost:${name}.git`,
        default_branch: 'main'
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ repos }));
    } else if (req.method === 'POST' && url.pathname === '/api/v1/user/repos') {
      // Create repo
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const data = JSON.parse(body);
        const repoName = data.name || 'new-repo';
        this.initRepo(repoName);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: repoName,
          name: repoName,
          full_name: `user/${repoName}`,
          description: data.description || '',
          private: data.private || false,
          html_url: `http://localhost:${PORT}/${repoName}`,
          clone_url: `http://localhost:${PORT}/${repoName}.git`,
          ssh_url: `git@localhost:${repoName}.git`,
          default_branch: 'main'
        }));
      });
    } else if (req.method === 'GET' && pathParts[0] === 'api' && pathParts[1] === 'v1' && pathParts[2] === 'repos' && pathParts[3] === 'test-repo') {
      // Get single repo
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'test-repo',
        name: 'test-repo',
        full_name: 'user/test-repo',
        description: 'Test repository for GitHub clone',
        private: false,
        html_url: `http://localhost:${PORT}/test-repo`,
        clone_url: `http://localhost:${PORT}/test-repo.git`,
        ssh_url: 'git@localhost:test-repo.git',
        default_branch: 'main',
        owner: {
          login: 'user',
          avatar_url: 'https://github.com/images/error/octocat_happy.gif'
        }
      }));
    } else if (req.method === 'GET' && pathParts[0] === 'test-repo.git' && pathParts[1] === 'info' && pathParts[2] === 'refs') {
      // Git info/refs
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('003fref: refs/heads/main\n');
    } else {
      // 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }
}

// Start server
const forge = new GitForge();
const server = http.createServer(forge.handleRequest.bind(forge));

server.listen(PORT, () => {
  console.log(`GitHub clone server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log(`  GET  /api/v1/repos`);
  console.log(`  POST /api/v1/user/repos`);
  console.log(`  GET  /api/v1/repos/test-repo`);
  console.log(`  GET  /test-repo.git/info/refs`);
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
