import React from 'react';
import { Network, Database, BrainCircuit, Globe, Layers, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

interface AgentCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const AgentCard = ({ icon, title, description }: AgentCardProps) => {
  return (
    <Card className="border-2 border-purple-400 bg-white p-3 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-purple-600">{icon}</div>
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </Card>
  );
};

const MultiAgentDiagram = () => {
  return (
    <div className="py-4">
      <h2 className="text-xl font-bold text-center mb-3">Multi-Agent Environment</h2>
      
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-2">
        <AgentCard 
          icon={<Network size={18} />}
          title="Research Agent"
          description="Collects relevant information from reliable sources"
        />
        <AgentCard 
          icon={<BrainCircuit size={18} />}
          title="Content Generation Agent"
          description="Creates engaging, original content"
        />
        <AgentCard 
          icon={<Database size={18} />}
          title="Fact Checking Agent"
          description="Validates information accuracy"
        />
        <AgentCard 
          icon={<Globe size={18} />}
          title="SEO/GEO Agent"
          description="Optimizes for search engines and geo-targeting"
        />
        <AgentCard 
          icon={<Layers size={18} />}
          title="Content Repurposing Agent"
          description="Adapts for different formats and channels"
        />
        <AgentCard 
          icon={<ImageIcon size={18} />}
          title="Media Agent"
          description="Finds and suggests relevant images for your content."
        />
      </div>
      
      {/* Mobile carousel */}
      <div className="md:hidden">
        <Carousel className="w-full">
          <CarouselContent>
            <CarouselItem>
              <div className="p-1">
                <AgentCard 
                  icon={<Network size={18} />}
                  title="Research Agent"
                  description="Collects relevant information from reliable sources"
                />
              </div>
            </CarouselItem>
            <CarouselItem>
              <div className="p-1">
                <AgentCard 
                  icon={<BrainCircuit size={18} />}
                  title="Content Generation Agent"
                  description="Creates engaging, original content"
                />
              </div>
            </CarouselItem>
            <CarouselItem>
              <div className="p-1">
                <AgentCard 
                  icon={<Database size={18} />}
                  title="Fact Checking Agent"
                  description="Validates information accuracy"
                />
              </div>
            </CarouselItem>
            <CarouselItem>
              <div className="p-1">
                <AgentCard 
                  icon={<Globe size={18} />}
                  title="SEO/GEO Agent"
                  description="Optimizes for search engines and geo-targeting"
                />
              </div>
            </CarouselItem>
            <CarouselItem>
              <div className="p-1">
                <AgentCard 
                  icon={<Layers size={18} />}
                  title="Content Repurposing Agent"
                  description="Adapts for different formats and channels"
                />
              </div>
            </CarouselItem>
            <CarouselItem>
              <div className="p-1">
                <AgentCard 
                  icon={<ImageIcon size={18} />}
                  title="Media Agent"
                  description="Finds and suggests relevant images for your content."
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
