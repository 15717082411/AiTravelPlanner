import OpenAI from 'openai';

interface PlanRequest {
  destination: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  partySize: number;
  preferences: string[];
  currency: string;
}

interface Activity {
  time: string;
  name: string;
  type: string;
  description?: string;
  estimatedCost?: number;
}

interface DayItinerary {
  date: string;
  activities: Activity[];
}

interface TravelPlan {
  destination: string;
  startDate: string;
  endDate: string;
  partySize: number;
  preferences: string[];
  currency: string;
  itinerary: DayItinerary[];
  budget: {
    totalEstimate: number;
    transportation: number;
    accommodation: number;
    food: number;
    attractions: number;
  };
  source?: 'deepseek' | 'fallback';
}

class DeepSeekService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is required');
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1',
    });
  }

  async generateTravelPlan(request: PlanRequest): Promise<TravelPlan> {
    const prompt = this.buildPrompt(request);
    
    try {
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的旅行规划师，擅长根据用户需求制定详细的旅行计划。请严格按照 JSON 格式返回结果，不要包含任何额外的文字说明。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        // 尝试要求模型返回严格 JSON（如不支持将忽略）
        response_format: { type: 'json_object' } as any,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('DeepSeek API 返回空内容');
      }

      // 解析 JSON 响应，容错提取
      const planData = this.safeParseJson(content);
      const plan = this.validateAndFormatPlan(planData, request);
      plan.source = 'deepseek';
      return plan;
    } catch (error) {
      console.error('DeepSeek API 调用失败:', error);
      // 如果 AI 调用失败，返回备用计划
      return this.generateFallbackPlan(request);
    }
  }

  private buildPrompt(request: PlanRequest): string {
    const days = this.calculateDays(request.startDate, request.endDate);
    const preferences = request.preferences.length > 0 ? request.preferences.join('、') : '无特殊偏好';
    
    return `请为以下旅行需求制定详细的行程计划：

目的地：${request.destination}
开始日期：${request.startDate || '未指定'}
结束日期：${request.endDate || '未指定'}
行程天数：${days}天
人数：${request.partySize}人
预算：${request.budget ? `${request.budget} ${request.currency}` : '未指定'}
偏好：${preferences}

请返回以下 JSON 格式的行程计划：
{
  "destination": "${request.destination}",
  "startDate": "${request.startDate || ''}",
  "endDate": "${request.endDate || ''}",
  "partySize": ${request.partySize},
  "preferences": ${JSON.stringify(request.preferences)},
  "currency": "${request.currency}",
  "itinerary": [
    {
      "date": "第1天",
      "activities": [
        {
          "time": "09:00",
          "name": "活动名称",
          "type": "sightseeing|food|accommodation|transportation|shopping|entertainment",
          "description": "详细描述",
          "estimatedCost": 100
        }
      ]
    }
  ],
  "budget": {
    "totalEstimate": 总预算估算,
    "transportation": 交通费用,
    "accommodation": 住宿费用,
    "food": 餐饮费用,
    "attractions": 景点门票费用
  }
}

要求：
1. 根据目的地特色安排合理的景点和活动
2. 考虑人数和预算进行费用估算
3. 活动时间安排要合理，避免过于紧凑
4. 包含当地特色美食推荐
5. 预算分配要符合实际情况
6. 每天安排3-5个主要活动`;
  }

  private calculateDays(startDate?: string, endDate?: string): number {
    if (!startDate || !endDate) return 3; // 默认3天
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(1, Math.min(diffDays, 14)); // 限制在1-14天之间
  }

  private validateAndFormatPlan(planData: any, request: PlanRequest): TravelPlan {
    // 验证和格式化 AI 返回的数据
    return {
      destination: planData.destination || request.destination,
      startDate: planData.startDate || request.startDate || '',
      endDate: planData.endDate || request.endDate || '',
      partySize: planData.partySize || request.partySize,
      preferences: planData.preferences || request.preferences,
      currency: planData.currency || request.currency,
      itinerary: planData.itinerary || [],
      budget: {
        totalEstimate: planData.budget?.totalEstimate || (request.budget || 1000),
        transportation: planData.budget?.transportation || 0,
        accommodation: planData.budget?.accommodation || 0,
        food: planData.budget?.food || 0,
        attractions: planData.budget?.attractions || 0,
      }
    };
  }

  private safeParseJson(content: string): any {
    // 直接尝试解析
    try { return JSON.parse(content); } catch {}
    // 提取第一个 JSON 对象片段
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    // 去除 Markdown 代码块包裹
    const fenced = content.replace(/```json[\s\S]*?```/g, (m) => m.replace(/```json|```/g, ''));
    try { return JSON.parse(fenced); } catch {}
    // 最终兜底：返回空对象，由上层填充默认值
    return {};
  }

  private generateFallbackPlan(request: PlanRequest): TravelPlan {
    // 备用计划，当 AI 调用失败时使用
    const days = this.calculateDays(request.startDate, request.endDate);
    const itinerary = Array.from({ length: days }, (_, i) => ({
      date: `第${i + 1}天`,
      activities: [
        { time: '09:00', name: `${request.destination} 经典景点游览`, type: 'sightseeing' },
        { time: '12:00', name: '当地特色餐厅用餐', type: 'food' },
        { time: '15:00', name: '自由活动时间', type: 'free' },
        { time: '18:00', name: '晚餐及休息', type: 'food' },
      ],
    }));

    const base = request.budget ?? 1000;
    const total = Math.round(base * (1 + (request.partySize - 1) * 0.6));

    return {
      destination: request.destination,
      startDate: request.startDate || '',
      endDate: request.endDate || '',
      partySize: request.partySize,
      preferences: request.preferences,
      currency: request.currency,
      itinerary,
      budget: {
        totalEstimate: total,
        transportation: Math.round(total * 0.3),
        accommodation: Math.round(total * 0.3),
        food: Math.round(total * 0.25),
        attractions: Math.round(total * 0.15),
      },
      source: 'fallback',
    };
  }
}

export default DeepSeekService;