import React from 'react';
import { Network, BrainCircuit, Database, Globe, Layers, Image as ImageIcon } from 'lucide-react';

interface AgentIconProps {
  icon: React.ReactNode;
  title: string;
}

const AgentIcon = ({ icon, title }: AgentIconProps) => {
  return (
    <div className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
      <div className="text-purple-600">{icon}</div>
      <span className="text-[10px] font-medium">{title}</span>
    </div>
  );
};

const FooterAgents = () => {
  return (
    <div className="flex justify-center gap-4 md:gap-6">
      <AgentIcon 
        icon={<Network size={16} />}
        title="Research"
      />
      <AgentIcon 
        icon={<BrainCircuit size={16} />}
        title="Content"
      />
      <AgentIcon 
        icon={<Database size={16} />}
        title="Facts"
      />
      <AgentIcon 
        icon={<Globe size={16} />}
        title="SEO/GEO"
      />
      <AgentIcon 
        icon={<Layers size={16} />}
        title="Repurpose"
      />
      <AgentIcon 
        icon={<ImageIcon size={16} />}
        title="Media"
      />
    </div>
  );
};

export default FooterAgents; 