import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Scale } from "lucide-react";

interface JudgePanelProps {
  status: "idle" | "thinking" | "judging" | "consensus";
  score: number;
  critique: string | null;
  round: number;
}

export function JudgePanel({ status, score, critique, round }: JudgePanelProps) {
  if (status === "idle" && round === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl mx-auto mt-8"
    >
      <Card className="border-2 border-primary/20 bg-background/80 backdrop-blur-md shadow-2xl overflow-hidden relative">
        {/* Status Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-muted">
           <motion.div 
             className="h-full bg-primary"
             initial={{ width: "0%" }}
             animate={{ width: status === "judging" ? "100%" : "0%" }}
             transition={{ duration: 2, repeat: status === "judging" ? Infinity : 0 }}
           />
        </div>

        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <div className="p-3 rounded-full bg-primary/10 text-primary border border-primary/20">
            <Scale className="w-6 h-6" />
          </div>
          <div className="flex-1">
             <CardTitle className="text-xl font-display uppercase tracking-widest text-primary">
               Chief Editor (The Judge)
             </CardTitle>
             <p className="text-xs text-muted-foreground font-mono">
               {status === "judging" ? "EVALUATING DRAFTS..." : `ROUND ${round} EVALUATION`}
             </p>
          </div>
          
          <div className="w-48 space-y-1">
            <div className="flex justify-between text-xs uppercase font-bold text-muted-foreground">
              <span>Consensus Score</span>
              <span className={score > 80 ? "text-green-500" : "text-amber-500"}>{score}%</span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
        </CardHeader>

        <CardContent>
          {status === "thinking" ? (
             <div className="py-8 text-center text-muted-foreground animate-pulse font-mono text-sm">
               Waiting for workers to submit drafts...
             </div>
          ) : (
            <div className="space-y-4">
               {critique && (
                 <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-lg border border-border bg-muted/30"
                 >
                   <div className="flex items-start gap-3">
                     {score > 85 ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                     ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                     )}
                     <div>
                       <h4 className="font-bold text-sm uppercase mb-1">
                         {score > 85 ? "Consensus Reached" : "Critique & Refinement Required"}
                       </h4>
                       <p className="text-sm leading-relaxed opacity-90">
                         {critique}
                       </p>
                     </div>
                   </div>
                 </motion.div>
               )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
