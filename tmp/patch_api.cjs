const fs = require('fs');
let content = fs.readFileSync('d:/Projects/a360/src/services/api.ts', 'utf8');

const regex = /return\s+([a-zA-Z0-9_]+)\.map\(/g;

content = content.replace(regex, (match, p1) => {
    return `return (${p1} || []).map(`;
});

fs.writeFileSync('d:/Projects/a360/src/services/api.ts', content, 'utf8');
console.log('Done mapping fixes.');
