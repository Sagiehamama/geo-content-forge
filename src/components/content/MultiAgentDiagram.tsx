
import React from 'react';
import { Search, FileText, ShieldCheck, Globe, Repeat } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface AgentCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const AgentCard = ({ icon, title, description }: AgentCardProps) => {
  return (
    <Card className="flex flex-col items-center p-6 shadow-md hover:shadow-lg transition-shadow">
      <div className="mb-4 text-theme-primary p-3 bg-primary/10 rounded-full">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-center text-sm text-muted-foreground">{description}</p>
    </Card>
  );
};

const MultiAgentDiagram = () => {
  return (
    <div className="py-12">
      <h2 className="text-3xl font-bold text-center mb-8">Multi-Agent Environment</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <AgentCard 
          icon={<Search size={24} />}
          title="Research Agent"
          description="Collects relevant and up-to-date information from reliable sources"
        />
        <AgentCard 
          icon={<FileText size={24} />}
          title="Content Generating Agent"
          description="Creates engaging, original content based on research material"
        />
        <AgentCard 
          icon={<ShieldCheck size={24} />}
          title="Fact Checking Agent"
          description="Validates information accuracy and ensures content reliability"
        />
        <AgentCard 
          icon={<Globe size={24} />}
          title="Technical SEO/GEO Agent"
          description="Optimizes content for search engines and location-specific targeting"
        />
        <AgentCard 
          icon={<Repeat size={24} />}
          title="Content Repurposing Agent"
          description="Adapts content for different formats and distribution channels"
        />
      </div>
    </div>
  );
};

export default MultiAgentDiagram;
