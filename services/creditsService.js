import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class CreditsService {
  constructor() {
    // Dynamic credit costs based on LLM complexity and token usage
    this.creditCosts = {
      'basic_question': 0,           // Free with rate limits
      'salary_analysis': 1,          // Claude Sonnet - simple analysis
      'skill_roadmap': 1,           // Claude Sonnet - structured response
      'detailed_analysis': 3,        // Claude Opus - comprehensive analysis
      'market_intelligence': 2,      // Perplexity + Claude Sonnet
      'regulatory_insights': 5,      // Claude Opus - complex legal analysis
      'career_transition_plan': 5    // Claude Opus - comprehensive planning
    };

    // Updated credit packages - $0.10 per credit base rate
    this.creditPackages = [
      {
        name: "Starter",
        credits: 100,
        price_cents: 1000,  // $10.00 = $0.10 per credit
        description: "Perfect for getting started with AI career insights",
        popular: false
      },
      {
        name: "Professional", 
        credits: 500,
        price_cents: 4500,  // $45.00 = $0.09 per credit (10% discount)
        description: "Great for regular career planning and development",
        popular: true
      },
      {
        name: "Business",
        credits: 2000,
        price_cents: 16000,  // $160.00 = $0.08 per credit (20% discount)
        description: "Best value for power users and teams"
      }
    ];

    // LLM-specific credit multipliers
    this.modelCosts = {
      'claude-sonnet': 1,      // Base rate
      'claude-opus': 5,        // 5x more expensive
      'perplexity-sonar': 0.5, // Cheaper for search queries
      'gpt-4': 3,              // Mid-tier pricing
      'gpt-3.5': 0.5          // Budget option
    };
  }

  async getUserCredits(userId) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { credits_remaining: true }
    });
    return user?.credits_remaining || 0;
  }

  async deductCredits(userId, amount, description, queryId) {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user || user.credits_remaining < amount) {
      throw new Error('Insufficient credits');
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { credits_remaining: user.credits_remaining - amount }
    });

    // Log the transaction
    await prisma.credit_transactions.create({
      data: {
        userId,
        transactionType: 'usage',
        creditsAmount: -amount,
        creditsBefore: user.credits_remaining,
        creditsAfter: updatedUser.credits_remaining,
        description,
        relatedQueryId: queryId
      }
    });

    return updatedUser.credits_remaining;
  }

  async addCredits(userId, amount, description = 'Credit purchase') {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { credits_remaining: user.credits_remaining + amount }
    });

    // Log the transaction
    await prisma.credit_transactions.create({
      data: {
        userId,
        transactionType: 'purchase',
        creditsAmount: amount,
        creditsBefore: user.credits_remaining,
        creditsAfter: updatedUser.credits_remaining,
        description
      }
    });

    return updatedUser.credits_remaining;
  }

  getQueryCost(queryType, model = 'claude-sonnet') {
    const baseCost = this.creditCosts[queryType] || 1;
    const modelMultiplier = this.modelCosts[model] || 1;
    return Math.ceil(baseCost * modelMultiplier);
  }

  getCreditPackages() {
    return this.creditPackages;
  }

  // Calculate actual USD cost for transparency
  getUSDCost(credits) {
    return (credits * 0.10).toFixed(2);
  }
}

export default CreditsService; 