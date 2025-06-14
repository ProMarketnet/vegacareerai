import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CreditsService {
  private creditCosts = {
    basic_question: 0,
    detailed_analysis: 2,
    market_intelligence: 3,
    salary_analysis: 1,
    skill_roadmap: 2,
    regulatory_insights: 3,
    career_transition_plan: 5,
  };

  async getUserCredits(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits_remaining: true }
    });
    return user?.credits_remaining ?? 0;
  }

  async getUserTransactions(userId: string) {
    return prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
  }

  async deductCredits(userId: string, amount: number, description: string, queryId?: string): Promise<number> {
    // Placeholder: deduct credits and log transaction
    return 0;
  }

  async addCredits(userId: string, amount: number, description = 'Credit purchase'): Promise<number> {
    // Placeholder: add credits and log transaction
    return 0;
  }

  getQueryCost(queryType: string): number {
    return this.creditCosts[queryType] || 0;
  }
} 