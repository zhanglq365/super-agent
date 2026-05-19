import dotenv from 'dotenv';
import { stepCountIs, streamText, type ModelMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai';
import { createInterface } from 'node:readline'; // 用于读取用户输入
import { weatherTool, calculatorTool } from './tools/utility-tools';

// 显示加载 .env.local
dotenv.config({ path: ['.env.local', '.env'] });

const client = createOpenAI({
  baseURL: process.env.DASHSCOPE_BASE_URL,
  apiKey: process.env.DASHSCOPE_API_KEY,
})

const tools = { 'get_weather': weatherTool, 'calculator': calculatorTool }
const messages: ModelMessage[] = [];

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

    try {
      // 流式输出
      const result = streamText({
        model: client.chat(process.env.DASHSCOPE_MODEL as string),
        system: `你是 Super Agent，一个专注于软件开发的 AI 助手。
        你说话简洁直接，喜欢用代码示例来解释问题。
        如果用户的问题不够清晰，你会反问而不是瞎猜。`,
        messages,
        tools,
        stopWhen: stepCountIs(5) // 实现 Agent 循环调用
      })

      process.stdout.write('Assistant: ')
      let fullResponse = ''
      // 使用全量输出流
      for await (const part of result.fullStream) {
        switch (part.type) {
          case 'text-delta':
            process.stdout.write(part.text);
            fullResponse += part.text;
            break;
          case 'tool-call':
            console.log(`\n [调用工具：${part.toolName}(${JSON.stringify(part.input)})]`);
            break;
          case 'tool-result':
            console.log(`\n [工具返回：${JSON.stringify(part.output)}]`);
            break;
          default:
            break;
        }
      }
      console.log(); // 换行

      // 添加到消息列表
      messages.push({ role: 'assistant', content: fullResponse })

      // 递归调用 ask 函数，继续等待用户输入
      ask()
    } catch (err: any) {
      console.error('message:', err?.message);
    }
  })
}

console.log('Super Agent v0.2 — Agent Loop (type "exit" to quit)\n');
ask();
