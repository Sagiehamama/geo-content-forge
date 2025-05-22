
import React from 'react';
import { Network, Database, BrainCircuit, Globe, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

interface AgentCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  colorClass: string;
}

const AgentCard = ({ icon, title, description, colorClass }: AgentCardProps) => {
  return (
    <Card className={`relative overflow-hidden ${colorClass} p-4 shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-white/20 p-2 rounded-md">{icon}</div>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm text-white/90">{description}</p>
    </Card>
  );
};

const MultiAgentDiagram = () => {
  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold text-center mb-6">Multi-Agent Environment</h2>
      
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-4">
        <AgentCard 
          icon={<Network size={24} />}
          title="Research Agent"
          description="Collects relevant information from reliable sources"
          colorClass="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <AgentCard 
          icon={<BrainCircuit size={24} />}
          title="Content Generation"
          description="Creates engaging, original content"
          colorClass="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <AgentCard 
          icon={<Database size={24} />}
          title="Fact Checking"
          description="Validates information accuracy"
          colorClass="bg-gradient-to-br from-green-500 to-green-600"
        />
        <AgentCard 
          icon={<Globe size={24} />}
          title="SEO/GEO Agent"
          description="Optimizes for search engines and geo-targeting"
          colorClass="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <AgentCard 
          icon={<Layers size={24} />}
          title="Content Repurposing"
          description="Adapts for different formats and channels"
          colorClass="bg-gradient-to-br from-red-500 to-red-600"
        />
      </div>
      
      {/* Mobile carousel */}
      <div className="md:hidden">
        <Carousel className="w-full">
          <CarouselContent>
            <CarouselItem>
              <div className="p-1">
                <AgentCard 
                  icon={<Network size={24} />}
                  title="Research Agent"
                  description="Collects relevant information from reliable sources"
                  colorClass="bg-gradient-to-br from-blue-500 to-blue-600"
                />
              </div>
            </CarouselItem>
            <CarouselItem>
              <div className="p-1">
                <AgentCard 
                  icon={<BrainCircuit size={24} />}
                  title="Content Generation"
                  description="Creates engaging, original content"
                  colorClass="bg-gradient-to-br from-purple-500 to-purple-600"
                />
              </div>
            </CarouselItem>
            <CarouselItem>
              <div className="p-1">
                <AgentCard 
                  icon={<Database size={24} />}
                  title="Fact Checking"
                  description="Validates information accuracy"
                  colorClass="bg-gradient-to-br from-green-500 to-green-600"
                />
              </div>
            </CarouselItem>
            <CarouselItem>
              <div className="p-1">
                <AgentCard 
                  icon={<Globe size={24} />}
                  title="SEO/GEO Agent"
                  description="Optimizes for search engines and geo-targeting"
                  colorClass="bg-gradient-to-br from-amber-500 to-amber-600"
                />
              </div>
            </CarouselItem>
            <CarouselItem>
              <div className="p-1">
                <AgentCard 
                  icon={<Layers size={24} />}
                  title="Content Repurposing"
                  description="Adapts for different formats and channels"
                  colorClass="bg-gradient-to-br from-red-500 to-red-600"
                />
              </div>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
};

export default MultiAgentDiagram;
