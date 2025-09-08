/**
 * Revenue tracking and analytics utilities
 * Integrates with Stripe data and funding meter
 */

export interface DailyRevenueData {
  day: string;
  currency: string;
  sales: number;
  refunds: number;
  disputes: number;
  disputes_won: number;
  other_adjustments: number;
  total_gross_activity: number;
  customers_count: number;
  sales_count: number;
  refund_count: number;
  dispute_count: number;
  disputes_won_count: number;
}

export interface RevenueAnalysis {
  totalRevenue: number;
  averageDailyRevenue: number;
  peakDay: { date: string; revenue: number };
  customerMetrics: {
    totalCustomers: number;
    averageTransactionValue: number;
    successRate: number;
  };
  projections: {
    monthly: number;
    annual: number;
    conservative: number;
    optimistic: number;
  };
}

/**
 * Analyzes daily revenue data and provides insights
 */
export function analyzeRevenueData(data: DailyRevenueData[]): RevenueAnalysis {
  const totalRevenue = data.reduce((sum, day) => sum + day.total_gross_activity, 0);
  const averageDailyRevenue = totalRevenue / data.length;
  
  const peakDay = data.reduce((peak, day) => 
    day.total_gross_activity > peak.revenue 
      ? { date: day.day, revenue: day.total_gross_activity }
      : peak,
    { date: '', revenue: 0 }
  );
  
  const totalCustomers = data.reduce((sum, day) => sum + day.customers_count, 0);
  const totalSales = data.reduce((sum, day) => sum + day.sales_count, 0);
  const totalRefunds = data.reduce((sum, day) => sum + day.refund_count, 0);
  const totalDisputes = data.reduce((sum, day) => sum + day.dispute_count, 0);
  
  const averageTransactionValue = totalRevenue / totalSales;
  const successRate = ((totalSales - totalRefunds - totalDisputes) / totalSales) * 100;
  
  // Projections based on current performance
  const monthly = averageDailyRevenue * 30;
  const annual = monthly * 12;
  const conservative = monthly * 0.8; // 20% buffer
  const optimistic = monthly * 1.5; // 50% growth potential
  
  return {
    totalRevenue,
    averageDailyRevenue,
    peakDay,
    customerMetrics: {
      totalCustomers,
      averageTransactionValue,
      successRate
    },
    projections: {
      monthly,
      annual,
      conservative,
      optimistic
    }
  };
}

/**
 * Calculates funding meter data based on revenue and costs
 */
export function calculateFundingData(
  baseBalance: number,
  recentRevenue: number,
  weeklyCost: number
) {
  const current = baseBalance + recentRevenue;
  const goal = weeklyCost * 4; // Monthly goal
  const progress = (current / goal) * 100;
  
  return {
    current,
    goal,
    progress: Math.min(progress, 100),
    isHealthy: current > goal,
    surplus: current - goal
  };
}

/**
 * Generates revenue insights for display
 */
export function generateRevenueInsights(analysis: RevenueAnalysis): string[] {
  const insights = [];
  
  // Revenue performance
  if (analysis.peakDay.revenue > analysis.averageDailyRevenue * 2) {
    insights.push(`🚀 Peak day (${analysis.peakDay.date}) generated ${((analysis.peakDay.revenue / analysis.totalRevenue) * 100).toFixed(1)}% of total revenue`);
  }
  
  // Customer satisfaction
  if (analysis.customerMetrics.successRate === 100) {
    insights.push('✅ Perfect customer satisfaction - 0% refunds/disputes');
  }
  
  // Growth potential
  if (analysis.projections.monthly > 1000) {
    insights.push(`📈 Strong growth trajectory - ${analysis.projections.monthly.toFixed(0)}/month projected`);
  }
  
  // Transaction value
  if (analysis.customerMetrics.averageTransactionValue > 25) {
    insights.push(`💰 Healthy average transaction value: $${analysis.customerMetrics.averageTransactionValue.toFixed(2)}`);
  }
  
  return insights;
}

/**
 * Formats currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Calculates growth rate between periods
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Generates recommendations based on revenue analysis
 */
export function generateRecommendations(analysis: RevenueAnalysis): string[] {
  const recommendations = [];
  
  // Peak day analysis
  if (analysis.peakDay.revenue > analysis.averageDailyRevenue * 2) {
    recommendations.push('Investigate what drove the peak day success and replicate those strategies');
  }
  
  // Customer retention
  if (analysis.customerMetrics.totalCustomers > 0) {
    recommendations.push('Focus on customer retention - convert one-time buyers to repeat customers');
  }
  
  // Pricing optimization
  if (analysis.customerMetrics.averageTransactionValue < 50) {
    recommendations.push('Consider testing higher-priced tiers or bundles to increase average transaction value');
  }
  
  // Growth scaling
  if (analysis.projections.monthly > 5000) {
    recommendations.push('Scale infrastructure and marketing to support projected growth');
  }
  
  return recommendations;
}
