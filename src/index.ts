import dotenv from 'dotenv';
import { stepCountIs, streamText, type ModelMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai';
import { createInterface } from 'node:readline'; // 用于读取用户输入
import { ToolRegistry, type ToolDefinition } from './tools/registry';
import { allTools } from './tools';
import { agentLoop } from './agent/loop';
import { createMockModel, setCacheEnabled } from './mock-model';
import { RemoteMCPClient, MockMCPClient } from './tools/mcp-client.js';
import { SessionStore } from './session/store';
import { coreRules, deferredTools, PromptBuilder, sessionContext, toolGuide, type PromptContext } from './context/prompt-builder';
import { estimateTokens, microcompact, summarize } from './context/compressor';
import { textToolResultOutput } from './context/tool-result-output';
import { applyDefense, estimateMessageTokens, TokenTracker } from './context/defense';
import { UsageTracker } from './usage/tracker';
import { buildContextSnapshot, renderContextView, renderUsageView } from './context/view';
import { createToolSearchTool } from './tools/tool-search';
import { createDispatcher, type CommandContext } from './commands';
import { MemoryStore } from './memory/store';
import { createMemoryTool } from './tools/memory-tools';
import { debugCommands } from './commands/debug';
import { contextCommands } from './commands/context';
import { memoryCommands } from './commands/memory';

// 显示加载 .env.local
dotenv.config({ path: ['.env.local', '.env'] });

const client = createOpenAI({
  baseURL: process.env.DASHSCOPE_BASE_URL,
  apiKey: process.env.DASHSCOPE_API_KEY,
})
const model = process.env.DASHSCOPE_MODEL ? client.chat(process.env.DASHSCOPE_MODEL as string) : createMockModel();

// ── Registry ────────────────────────────────
const registry = new ToolRegistry();
registry.register(...allTools);
registry.register(createToolSearchTool(registry));

// ── Memory ────────────────────────────────
const memoryStore = new MemoryStore('.');
memoryStore.init();
registry.register(createMemoryTool(memoryStore));

async function connectMCP() {
  const mockClient = new MockMCPClient();
  const tools = await registry.registerMCPServer('github', mockClient);
  console.log(`  已注册 ${tools.length} 个 Mock MCP 工具`);
}

// ── Commands ────────────────────────────────
const dispatch = createDispatcher([
  ...debugCommands,
  ...contextCommands,
  ...memoryCommands,
]);

async function main() {
  await connectMCP();

  const store = new SessionStore('default');
  let messages: ModelMessage[] = [];
  const timestamps = new Map<number, number>();
  const tracker = new UsageTracker('.usage/today.jsonl');

  const builder = new PromptBuilder()
    .pipe('coreRules', coreRules())
    .pipe('toolGuide', toolGuide())
    .pipe('deferredTools', deferredTools())
    .pipe('memoryContext', () => memoryStore.buildPromptSection())
    .pipe('sessionContext', sessionContext());

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  function makePromptCtx(): PromptContext {
    return {
      toolCount: registry.getActiveTools().length,
      deferredToolSummary: registry.getDeferredToolSummary(),
      sessionMessageCount: messages.length,
      sessionId: 'default',
    };
  }

  function ask() {
    rl.question('\nYou: ', async (input) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed === 'exit') { console.log('Bye!'); rl.close(); return; }

      const ctx: CommandContext = {
        messages, timestamps, registry, builder, tracker,
        sessionStore: store, model, makePromptCtx, ask,
        memoryStore,
      };
      const handled = dispatch(trimmed, ctx);
      if (handled === 'async') return;
      if (handled) { ask(); return; }

      const userMsg: ModelMessage = { role: 'user', content: trimmed };
      messages.push(userMsg);
      timestamps.set(messages.length - 1, Date.now());
      store.append(userMsg);

      const currentSystem = builder.build(makePromptCtx());
      const beforeLen = messages.length;
      await agentLoop(model, registry, messages, currentSystem, tracker);

      const newMessages = messages.slice(beforeLen);
      const now = Date.now();
      for (let i = beforeLen; i < messages.length; i++) timestamps.set(i, now);
      store.appendAll(newMessages);

      console.log(`  [Token] ~${estimateMessageTokens(messages)} tokens`);
      ask();
    });
  }

  console.log('Super Agent v0.11 — Memory System (type "exit" to quit)');
  console.log('快捷命令：');
  console.log('  /memory         — 查看所有记忆');
  console.log('  /memory search  — 搜索记忆');
  console.log('  /context        — 终端里看 context 占用矩阵');
  console.log('  /usage          — 累计 token 用量和成本');
  console.log('  status          — 当前消息数、token 和记忆数');
  console.log('');
  console.log(`  已加载 ${memoryStore.list().length} 条历史记忆`);
  console.log('');

  ask();
}

main().catch(console.error);
