import dotenv from 'dotenv';
import { stepCountIs, streamText, type ModelMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai';
import { createInterface } from 'node:readline'; // 用于读取用户输入
import { weatherTool, calculatorTool } from './tools/utility-tools';
import { agentLoop, type BudgetState } from './agent/loop';
import { createMockModel } from './mock-model';

// 显示加载 .env.local
dotenv.config({ path: ['.env.local', '.env'] });

const client = createOpenAI({
  baseURL: process.env.DASHSCOPE_BASE_URL,
  apiKey: process.env.DASHSCOPE_API_KEY,
})
const model = process.env.DASHSCOPE_MODEL ? client.chat(process.env.DASHSCOPE_MODEL as string) : createMockModel();

const tools = { 'get_weather': weatherTool, 'calculator': calculatorTool }
const messages: ModelMessage[] = [];

// 预算由调用方持有，跨轮持续累计——agentLoop 只负责消费它
const budget: BudgetState = { used: 0, limit: 15000 };

const SYSTEM = `你是 Super Agent，一个有工具调用能力的 AI 助手。
需要查询信息时，主动使用工具，不要编造数据。
回答要简洁直接。`;

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});


function ask() {
  rl.question('\nYou: ', async (input) => {
    const trimmed = input.trim();
    if (!trimmed || trimmed === 'exit') {
      console.log('Bye!');
      rl.close();
      return;
    }

    messages.push({
      role: 'user',
      content: trimmed,
    })

    await agentLoop(model, tools, messages, SYSTEM, budget)

    // 递归调用 ask 函数，继续等待用户输入
    ask()
  })
}

console.log('Super Agent v0.2 — Agent Loop (type "exit" to quit)\n');
ask();
