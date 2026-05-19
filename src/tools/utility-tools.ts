import { jsonSchema } from "ai";

export const weatherTool = {
  name: 'get_weather',
  description: '查询指定城市的天气信息',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      city: { type: 'string', description: '城市的名称, 例如: 北京、杭州' }
    },
    required: ['city'],
    additionalProperties: false,
  }),
  execute: async ({ city }: { city: string }) => {
    // 模拟数据
    const mockWeather: Record<string, string> = {
      '北京': '晴，15-25°C，东南风 2 级',
      '上海': '多云，18-22°C，西南风 3 级',
      '杭州': '阵雨，22-28°C，南风 2 级',
    };
    return mockWeather[city] || `未找到${city}的天气信息`;
  }
}

export const calculatorTool = {
  name: 'calculator',
  description: '计算数学结果，当提问包含数学运算时使用',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      expression: { type: 'string', description: '数学表达式, 例如: 2 + 3 * 4' }
    },
    required: ['expression'],
    additionalProperties: false,
  }),
  execute: async ({ expression }: { expression: string }) => {
    try {
      // 评估表达式
      // 注意：eval 函数存在安全风险，仅用于简单表达式
      // 实际应用中应使用更安全的解析器
      const result = new Function(`return ${expression};`)();
      return `${expression} = ${result}`;
    } catch (error) {
      return `无法计算: ${expression}`;
    }
  }
}