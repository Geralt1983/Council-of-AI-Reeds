import { useState } from "react";
import { useCouncilSimulation, WORKERS } from "@/lib/useCouncil";
import { WorkerCard } from "@/components/council/worker-card";
import { JudgePanel } from "@/components/council/judge-panel";
import { ChatInput } from "@/components/council/chat-input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, BrainCircuit, Plus, AlertCircle, History, PanelLeftClose, PanelLeft, Menu } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CouncilPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { 
    status, 
    round, 
    query: activeQuery, 
    drafts, 
    critique, 
    score, 
    consensus,
    error,
    submitQuery,
    reset,
    history,
    loadHistory,
    canInput,
    isFollowUpReady
  } = useCouncilSimulation();

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground font-sans">
      
      {sidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden" 
            onClick={() => setSidebarOpen(false)} 
          />
          <aside className="fixed md:relative w-64 h-full border-r border-border bg-card z-50 flex flex-col shrink-0">
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
                onClick={() => { reset(); setSidebarOpen(false); }} 
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
                        onClick={() => { loadHistory(item); setSidebarOpen(false); }}
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
        </>
      )}

      <main className="flex-1 overflow-x-hidden relative">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <span className="font-bold font-display">AI Council</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <div className="hidden md:flex items-center gap-4 p-4">
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
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-12 pb-40">
          
          {status === "idle" && (
            <section className="text-center space-y-6 max-w-3xl mx-auto pt-8 md:pt-20 px-2">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium border border-primary/20"
              >
                <BrainCircuit className="w-3 h-3 md:w-4 md:h-4" />
                <span>AI Consensus Architecture</span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-6xl font-bold tracking-tight font-display bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50"
              >
                The AI Council
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-base md:text-lg max-w-lg mx-auto"
              >
                Three AI personas debate your query. A Judge synthesizes the truth.
              </motion.p>

              {error && (
                <Alert variant="destructive" className="max-w-2xl mx-auto">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </section>
          )}

          <AnimatePresence mode="wait">
            {status !== "idle" && status !== "consensus" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8 md:space-y-12"
              >
                <div className="text-center px-2">
                  <h2 className="text-lg md:text-2xl font-display text-foreground/80 leading-tight">"{activeQuery}"</h2>
                </div>

                <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8">
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

                <div className="md:hidden">
                  <Tabs defaultValue="worker-a" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted/50 p-1 rounded-xl h-auto">
                      {WORKERS.map((w) => (
                        <TabsTrigger 
                          key={w.id} 
                          value={w.id}
                          className="text-xs font-medium rounded-lg py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        >
                          <span className="mr-1">{w.avatar}</span>
                          <span className="hidden xs:inline">{w.role}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {WORKERS.map((worker) => {
                      const draft = drafts.find(d => d.workerId === worker.id);
                      return (
                        <TabsContent key={worker.id} value={worker.id} className="mt-0">
                          <WorkerCard 
                            worker={worker}
                            draft={draft}
                            isThinking={status === "thinking" && draft?.status !== "complete"}
                          />
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </div>

                <JudgePanel 
                  status={status} 
                  score={score} 
                  critique={critique} 
                  round={round}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {status === "consensus" && consensus && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="max-w-4xl mx-auto"
            >
              <div className="text-center mb-6 px-2">
                <h2 className="text-lg md:text-2xl font-display text-foreground/80 leading-tight">"{activeQuery}"</h2>
              </div>
              
              <div className="p-[2px] rounded-2xl md:rounded-3xl bg-gradient-to-r from-primary via-purple-500 to-blue-500 shadow-2xl shadow-primary/20">
                <div className="bg-background/95 backdrop-blur-xl rounded-2xl md:rounded-3xl p-5 md:p-8 border border-white/10">
                  <div className="flex items-center gap-2 md:gap-3 mb-4 text-primary">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
                    <h3 className="text-base md:text-lg font-bold tracking-widest uppercase font-display">Final Consensus</h3>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-base md:text-xl leading-relaxed font-medium text-foreground/90 whitespace-pre-wrap">
                      {consensus}
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button 
                      onClick={reset} 
                      variant="outline" 
                      className="text-foreground"
                      data-testid="button-new-session-inline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Topic
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent z-50">
          <div className="max-w-3xl mx-auto">
            <ChatInput 
              onSend={submitQuery} 
              disabled={!canInput}
              placeholder={isFollowUpReady ? "Ask a follow-up question..." : "Present your dilemma to the Council..."}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
