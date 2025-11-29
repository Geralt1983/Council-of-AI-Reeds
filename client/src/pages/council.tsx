import { useState } from "react";
import { useCouncilSimulation, WORKERS } from "@/lib/useCouncil";
import { WorkerCard } from "@/components/council/worker-card";
import { JudgePanel } from "@/components/council/judge-panel";
import { ChatInput } from "@/components/council/chat-input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, BrainCircuit, Plus, AlertCircle, History, PanelLeftClose, PanelLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CouncilPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const { 
    status, 
    round, 
    query: activeQuery, 
    drafts, 
    critique, 
    score, 
    consensus,
    error,
    startSimulation,
    reset,
    history,
    loadHistory
  } = useCouncilSimulation();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground font-sans">
      
      {sidebarOpen && (
        <aside className="w-64 border-r border-border bg-card/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <span className="font-bold font-display">AI Council</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setSidebarOpen(false)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              onClick={reset} 
              className="w-full justify-start gap-2" 
              variant="outline"
              data-testid="button-new-session"
            >
              <Plus className="h-4 w-4" /> New Session
            </Button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                <History className="h-3 w-3" />
                History
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-140px)]">
              {history.length === 0 ? (
                <div className="px-4 py-6 text-xs text-muted-foreground text-center">
                  No past sessions yet.
                </div>
              ) : (
                <div className="px-2 space-y-1">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => loadHistory(item)}
                      className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`history-item-${item.id}`}
                    >
                      <span className="font-medium text-sm line-clamp-2">{item.query}</span>
                      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                        <span>{item.date}</span>
                        <span className={item.score >= 90 ? "text-green-500" : "text-amber-500"}>
                          Score: {item.score}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12">
          
          {!sidebarOpen && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}

          {status === "idle" && (
            <section className="text-center space-y-6 max-w-3xl mx-auto pt-12 md:pt-24">
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

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full mt-10"
              >
                <ChatInput 
                  onSend={(val) => startSimulation(val)} 
                  disabled={status !== "idle" && status !== "consensus"}
                  placeholder="Present your dilemma to the Council..."
                />
              </motion.div>
            </section>
          )}

          <AnimatePresence mode="wait">
            {status !== "idle" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-12"
              >
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-display text-foreground/80">"{activeQuery}"</h2>
                </div>

                {status !== "consensus" && (
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
                )}

                {status !== "consensus" && (
                  <JudgePanel 
                    status={status} 
                    score={score} 
                    critique={critique} 
                    round={round}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {status === "consensus" && consensus && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="max-w-4xl mx-auto"
            >
              <div className="p-1 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-blue-500 shadow-2xl shadow-primary/20">
                <div className="bg-background/95 backdrop-blur-xl rounded-xl p-6 md:p-8 border border-white/10">
                  <div className="flex items-center gap-3 mb-4 text-primary">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                    <h3 className="text-lg font-bold tracking-widest uppercase font-display">Final Consensus Reached</h3>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-lg md:text-xl leading-relaxed font-medium text-foreground/90 whitespace-pre-wrap">
                      {consensus}
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button 
                      onClick={reset} 
                      variant="ghost" 
                      className="text-muted-foreground hover:text-foreground"
                      data-testid="button-new-session-inline"
                    >
                      Start New Session
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
