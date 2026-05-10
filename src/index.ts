import dotenv from 'dotenv';
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai';

// 显示加载 .env.local
dotenv.config({ path: ['.env.local', '.env'] });

const client = createOpenAI({
  baseURL: process.env.DASHSCOPE_BASE_URL,
  apiKey: process.env.DASHSCOPE_API_KEY,
})

async function main() {

  try {
    // 同步输出
    const { text } = await generateText({
      model: client.chat(process.env.DASHSCOPE_MODEL as string),
      prompt: '用一句话介绍你自己'
    })
    console.log('测试：', text)
  } catch (err: any) {
    console.error('message:', err?.message);
  }
}

main()
