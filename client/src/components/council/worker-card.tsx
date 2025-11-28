import { motion } from "framer-motion";
import { Draft, Worker } from "@/lib/simulation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkerCardProps {
  worker: Worker;
  draft?: Draft;
  isThinking: boolean;
}

export function WorkerCard({ worker, draft, isThinking }: WorkerCardProps) {
  const borderColor = worker.color.replace("var(", "").replace(")", ""); // This is hacky for inline styles if not careful, but we used CSS vars.
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Card className="h-full border-t-4 bg-card/50 backdrop-blur-sm border-x-border border-b-border shadow-lg transition-all duration-300 hover:shadow-xl"
            style={{ borderTopColor: worker.color }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl">{worker.avatar}</div>
              <div>
                <CardTitle className="text-lg font-bold tracking-tight">{worker.name}</CardTitle>
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{worker.role}</div>
              </div>
            </div>
            {isThinking && (
              <Badge variant="outline" className="animate-pulse border-primary/50 text-primary">
                Thinking...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px] w-full rounded-md border border-border/50 bg-background/50 p-4">
             {draft?.content ? (
               <p className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                 {draft.content}
                 {draft.status === "streaming" && <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse"/>}
               </p>
             ) : (
               <div className="h-full flex items-center justify-center text-muted-foreground/40 italic text-sm">
                 Waiting for input...
               </div>
             )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
