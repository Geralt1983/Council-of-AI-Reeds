import { useState } from "react";
import { useCouncilSimulation, WORKERS } from "@/lib/useCouncil";
import { WorkerCard } from "@/components/council/worker-card";
import { JudgePanel } from "@/components/council/judge-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, SendHorizontal, BrainCircuit, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CouncilPage() {
  const { 
    status, 
    round, 
    query: activeQuery, 
    drafts, 
    critique, 
    score, 
    consensus,
    error,
    startSimulation 
  } = useCouncilSimulation();

  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    startSimulation(inputValue);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-sans overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Hero / Input Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto pt-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20"
          >
            <BrainCircuit className="w-4 h-4" />
            <span>AI Consensus Architecture v1.0</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold tracking-tight font-display bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50"
          >
            The AI Council
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Three distinct AI personas debate your query. <br className="hidden md:block"/>
            A Judge synthesizes the truth.
          </motion.p>

          {error && (
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onSubmit={handleSubmit}
            className="relative flex items-center w-full max-w-2xl mx-auto mt-8"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter a complex query (e.g., 'How do I balance work and life?')..."
              className="h-14 pl-6 pr-16 text-lg bg-background/50 border-primary/20 focus-visible:ring-primary/50 rounded-2xl shadow-lg backdrop-blur-xl"
              disabled={status !== "idle" && status !== "consensus"}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!inputValue.trim() || (status !== "idle" && status !== "consensus")}
              className="absolute right-2 top-2 bottom-2 w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <SendHorizontal className="w-5 h-5" />
            </Button>
          </motion.form>
        </section>

        {/* Main Grid */}
        <AnimatePresence mode="wait">
          {status !== "idle" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              {/* Current Query Display */}
              <div className="text-center">
                 <h2 className="text-xl md:text-2xl font-display text-foreground/80">"{activeQuery}"</h2>
              </div>

              {/* Workers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {WORKERS.map((worker) => {
                  const draft = drafts.find(d => d.workerId === worker.id);
                  return (
                    <WorkerCard 
                      key={worker.id}
                      worker={worker}
                      draft={draft}
                      isThinking={status === "thinking" && draft?.status !== "complete"}
                    />
                  );
                })}
              </div>

              {/* Judge Panel */}
              <JudgePanel 
                status={status} 
                score={score} 
                critique={critique} 
                round={round}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Final Consensus Overlay/Section */}
        <AnimatePresence>
          {status === "consensus" && consensus && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="fixed inset-x-4 bottom-4 md:inset-x-auto md:bottom-12 md:left-1/2 md:-translate-x-1/2 md:w-[800px] z-50"
            >
              <div className="p-1 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-blue-500 shadow-2xl shadow-primary/20">
                <div className="bg-background/95 backdrop-blur-xl rounded-xl p-6 md:p-8 border border-white/10">
                  <div className="flex items-center gap-3 mb-4 text-primary">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                    <h3 className="text-lg font-bold tracking-widest uppercase font-display">Final Consensus Reached</h3>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-lg md:text-xl leading-relaxed font-medium text-foreground/90">
                      {consensus}
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button 
                      onClick={() => window.location.reload()} 
                      variant="ghost" 
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Start New Session
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
