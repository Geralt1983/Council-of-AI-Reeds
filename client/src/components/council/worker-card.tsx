import { motion } from "framer-motion";
import { type DraftDisplay, type Worker } from "@/lib/useCouncil";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface WorkerCardProps {
  worker: Worker;
  draft?: DraftDisplay;
  isThinking: boolean;
}

export function WorkerCard({ worker, draft, isThinking }: WorkerCardProps) {
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
              <Badge variant="outline" className="animate-pulse border-primary/50 text-primary flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
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
                 {draft.status === "streaming" && (
                   <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle rounded-sm" />
                 )}
               </p>
             ) : isThinking ? (
               <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground/60">
                 <div className="flex gap-1">
                   <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                   <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                   <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                 </div>
                 <span className="text-xs italic">Generating response...</span>
               </div>
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
