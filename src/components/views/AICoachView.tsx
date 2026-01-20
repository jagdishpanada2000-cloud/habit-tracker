'use client';

import { useEffect, useState } from 'react';
import { Lock, Sparkles, TrendingUp, AlertCircle, Calendar, Crown, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiService, AIInsight } from '@/services/ai';
import { profileService, Profile } from '@/services/profile';
import { toast } from 'sonner';

const features = [
  'Personalized habit recommendations',
  'Pattern detection and insights',
  'Weekly AI-generated summaries',
  'Optimal scheduling suggestions',
  'Behavior prediction',
  'Goal achievement strategies',
];

export const AICoachView = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userProfile = await profileService.getProfile();
      setProfile(userProfile);

      if (userProfile?.is_pro) {
        const data = await aiService.getInsights();
        setInsights(data);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load AI Coach data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      await profileService.upgradeToPro();
      toast.success('Welcome to Pro! Refreshing...');
      loadData();
    } catch (error) {
      toast.error('Upgrade failed');
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await aiService.generateInsights();
      toast.success('New insights generated!');
      // Short delay to allow DB propagation if needed, or just reload
      setTimeout(loadData, 1000);
    } catch (error) {
      toast.error('Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pattern': return TrendingUp;
      case 'suggestion': return AlertCircle;
      case 'summary': return Calendar;
      default: return Sparkles;
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading AI Coach...</div>;
  }

  const isPro = profile?.is_pro;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-secondary" />
            <h1 className="text-2xl font-bold">AI Coach</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Unlock intelligent insights powered by AI</p>
        </div>
        {isPro && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Analyzing...' : 'Refresh Insights'}
          </Button>
        )}
      </div>

      {!isPro ? (
        <div className="glass-card p-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-secondary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Upgrade to Pro</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            Get personalized AI insights, pattern detection, and intelligent recommendations to optimize your habits.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto mb-6 text-left">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            onClick={handleUpgrade}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2"
          >
            <Crown className="w-4 h-4" />
            Upgrade to Pro
          </Button>
          <p className="text-xs text-muted-foreground mt-3">Starting at $4.99/month</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">No insights yet. Click refresh to analyze your habits!</p>
            </div>
          ) : (
            <div className="space-y-3 relative">
              {insights.map((insight, idx) => {
                const Icon = getIcon(insight.type);
                return (
                  <div
                    key={insight.id}
                    className="glass-card p-4 animate-fade-in"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{insight.title}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(insight.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Preview Section for Non-Pro users (keep existing mock visual as preview) */}
      {!isPro && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Preview AI Insights</h3>
          <div className="space-y-3 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-10 pointer-events-none" />
            {[
              { icon: TrendingUp, title: 'Pattern Detected', content: 'Your workout completion drops 40% on Thursdays...' },
              { icon: AlertCircle, title: 'Suggested Adjustment', content: 'Moving meditation from evening to morning could improve...' }
            ].map((insight, idx) => (
              <div key={idx} className="glass-card p-4 opacity-60">
                <div className="flex items-center gap-2 mb-2">
                  <insight.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{insight.title}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{insight.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
