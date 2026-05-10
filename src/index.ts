import dotenv from 'dotenv';
import { generateText, streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai';

// 显示加载 .env.local
dotenv.config({ path: ['.env.local', '.env'] });

const client = createOpenAI({
  baseURL: process.env.DASHSCOPE_BASE_URL,
  apiKey: process.env.DASHSCOPE_API_KEY,
})

async function main() {

  try {
    // 1. 同步输出
    // const { text } = await generateText({
    //   model: client.chat(process.env.DASHSCOPE_MODEL as string),
    //   prompt: '用一句话介绍你自己'
    // })
    // console.log('测试：', text)

    // 2. 流式输出
    const result = await streamText({
      model: client.chat(process.env.DASHSCOPE_MODEL as string),
      prompt: '用一句话介绍你自己',
    })
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }

    console.log(); // 换行
  } catch (err: any) {
    console.error('message:', err?.message);
  }
}

main()
