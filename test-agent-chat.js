/**
 * Test Suite: Agentic AI Chatbot & Global Sidebar
 * Run with: node test-agent-chat.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    pass++;
  } catch (err) {
    console.log(`  FAIL: ${name} - ${err.message}`);
    fail++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

console.log('\n=== XRPlot Agentic AI & Sidebar Test Suite ===\n');

// --- 1. Global Sidebar ---
console.log('--- 1. Global Sidebar ---');
test('Sidebar component exists', () => assert(fileExists('src/components/Sidebar.js')));
test('SidebarWrapper component exists', () => assert(fileExists('src/components/SidebarWrapper.js')));
test('Sidebar has profile (UserButton)', () => {
  const code = read('src/components/Sidebar.js');
  assert(code.includes('UserButton'), 'Missing UserButton');
});
test('Sidebar has settings button', () => {
  const code = read('src/components/Sidebar.js');
  assert(code.includes('Settings'), 'Missing Settings icon');
});
test('Sidebar has folders list with expand/collapse', () => {
  const code = read('src/components/Sidebar.js');
  assert(code.includes('folders'), 'Missing folders state');
  assert(code.includes('expandedFolders'), 'Missing expandedFolders state');
});
test('Sidebar has theme toggle button (no full impl)', () => {
  const code = read('src/components/Sidebar.js');
  assert(code.includes('toggleTheme'), 'Missing toggleTheme');
  assert(code.includes('Sun') || code.includes('Moon'), 'Missing theme icons');
});
test('Sidebar has signout button', () => {
  const code = read('src/components/Sidebar.js');
  assert(code.includes('signOut'), 'Missing signOut');
  assert(code.includes('LogOut'), 'Missing LogOut icon');
});
test('Sidebar has chat button linking to /chat', () => {
  const code = read('src/components/Sidebar.js');
  assert(code.includes('"/chat"'), 'Missing /chat link');
});
test('layout.js wraps with SidebarWrapper', () => {
  const code = read('src/app/layout.js');
  assert(code.includes('SidebarWrapper'), 'Missing SidebarWrapper in layout');
});

// --- 2. Chat Page ---
console.log('\n--- 2. Chat Page ---');
test('Chat page exists at /chat', () => assert(fileExists('src/app/chat/page.js')));
test('Chat page has conversation sidebar', () => {
  const code = read('src/app/chat/page.js');
  assert(code.includes('chat-sidebar'), 'Missing chat-sidebar');
});
test('Chat page has new chat button', () => {
  const code = read('src/app/chat/page.js');
  assert(code.includes('createNewChat'), 'Missing createNewChat');
});
test('Chat page has message history display', () => {
  const code = read('src/app/chat/page.js');
  assert(code.includes('chat-messages'), 'Missing chat-messages');
});
test('Chat page has input and send', () => {
  const code = read('src/app/chat/page.js');
  assert(code.includes('chat-input'), 'Missing chat-input');
  assert(code.includes('sendMessage'), 'Missing sendMessage');
});

// --- 3. Chat Memory (MongoDB) ---
console.log('\n--- 3. Chat Memory ---');
test('Chat model exists', () => assert(fileExists('src/models/Chat.js')));
test('Chat model has clerkUserId index', () => {
  const code = read('src/models/Chat.js');
  assert(code.includes('clerkUserId'), 'Missing clerkUserId');
  assert(code.includes('messages'), 'Missing messages array');
});
test('GET /api/chat route exists', () => assert(fileExists('src/app/api/chat/route.js')));
test('POST /api/chat route exists', () => assert(fileExists('src/app/api/chat/route.js')));
test('GET /api/chat/[chatId] route exists', () => assert(fileExists('src/app/api/chat/[chatId]/route.js')));
test('POST /api/chat/[chatId]/messages route exists', () => assert(fileExists('src/app/api/chat/[chatId]/messages/route.js')));

// --- 4. Gemini Agent ---
console.log('\n--- 4. Gemini Agent ---');
test('agent.js exists', () => assert(fileExists('src/lib/agent.js')));
test('Uses Gemini 3 Flash Preview model', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes("gemini-3-flash-preview"), 'Wrong model name');
});
test('Uses GEMINI_API_KEY from env', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes('GEMINI_API_KEY'), 'Missing GEMINI_API_KEY reference');
});
test('Exports runAgent function', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes('export async function runAgent'), 'Missing runAgent export');
});
test('Has createWorld tool', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes('createWorld'), 'Missing createWorld tool');
});
test('Has createNode tool', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes('createNode'), 'Missing createNode tool');
});
test('Has createConnection tool', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes('createConnection'), 'Missing createConnection tool');
});
test('Has createFolder tool', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes('createFolder'), 'Missing createFolder tool');
});
test('Has createPredictionWorld tool', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes('createPredictionWorld'), 'Missing createPredictionWorld tool');
});
test('Has requestImageUpload tool', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes('requestImageUpload'), 'Missing requestImageUpload tool');
});
test('Has CRUD tools for worlds', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes('createWorld') && code.includes('updateWorld') && code.includes('deleteWorld'), 'Missing world CRUD');
});
test('Has CRUD tools for folders', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes('createFolder') && code.includes('updateFolder') && code.includes('deleteFolder'), 'Missing folder CRUD');
});
test('Has CRUD tools for nodes', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes('createNode') && code.includes('updateNode') && code.includes('deleteNode'), 'Missing node CRUD');
});
test('Has getWorlds and getWorld tools', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes('getWorlds') && code.includes('getWorld'), 'Missing get tools');
});
test('Agent returns links in responses', () => {
  const code = read('src/lib/agent.js');
  assert(code.includes('link:'), 'Agent does not return links');
});

// --- 5. Chat Upload Modal ---
console.log('\n--- 5. Chat Upload Modal ---');
test('ChatUploadModal component exists', () => assert(fileExists('src/components/ChatUploadModal.js')));
test('Has 5 direction sections (up, down, left, right, middle)', () => {
  const code = read('src/components/ChatUploadModal.js');
  assert(code.includes("'up'") && code.includes("'down'") && code.includes("'left'") && code.includes("'right'") && code.includes("'middle'"), 'Missing directions');
});
test('Has camera capture functionality', () => {
  const code = read('src/components/ChatUploadModal.js');
  assert(code.includes('getUserMedia'), 'Missing camera capture');
});
test('Has file upload input', () => {
  const code = read('src/components/ChatUploadModal.js');
  assert(code.includes('type="file"'), 'Missing file input');
});

// --- 6. CSS Layout ---
console.log('\n--- 6. CSS Layout ---');
test('globals.css has app-sidebar styles', () => {
  const code = read('src/app/globals.css');
  assert(code.includes('.app-sidebar'), 'Missing .app-sidebar styles');
});
test('globals.css has chat-layout styles', () => {
  const code = read('src/app/globals.css');
  assert(code.includes('.chat-layout'), 'Missing .chat-layout styles');
});

// --- Summary ---
console.log('\n=== Summary ===');
console.log(`Passed: ${pass}`);
console.log(`Failed: ${fail}`);
console.log(`Total:  ${pass + fail}`);

if (fail > 0) {
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
}
