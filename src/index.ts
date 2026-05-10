import dotenv from 'dotenv';
import { generateText, streamText, type ModelMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai';
import { createInterface } from 'node:readline'; // 用于读取用户输入

// 显示加载 .env.local
dotenv.config({ path: ['.env.local', '.env'] });

const client = createOpenAI({
  baseURL: process.env.DASHSCOPE_BASE_URL,
  apiKey: process.env.DASHSCOPE_API_KEY,
})

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const messages: ModelMessage[] = [];

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
        messages
      })

      process.stdout.write('Assistant: ')
      let fullResponse = ''
      for await (const chunk of result.textStream) {
        process.stdout.write(chunk);
        // 记录完整输出
        fullResponse += chunk
      }
      console.log(); // 换行

      // 添加到消息列表
      messages.push({
        role: 'assistant',
        content: fullResponse,
      })

      // 递归调用 ask 函数，继续等待用户输入
      ask()
    } catch (err: any) {
      console.error('message:', err?.message);
    }
  })
}

console.log('Super Agent v0.1 (type "exit" to quit)\n');
ask();
