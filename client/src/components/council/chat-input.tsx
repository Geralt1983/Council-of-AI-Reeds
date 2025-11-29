import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SendHorizontal, Paperclip, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [value]);

  return (
    <div className="relative w-full max-w-3xl mx-auto px-2 md:px-0">
      <motion.div
        animate={{
          opacity: isFocused ? 1 : 0,
          scale: isFocused ? 1.02 : 0.98,
        }}
        className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-primary/50 via-purple-500/30 to-blue-500/50 blur opacity-0 transition-opacity duration-500"
      />

      <div
        className={cn(
          "relative flex flex-col bg-background/80 backdrop-blur-xl border rounded-[20px] md:rounded-3xl shadow-2xl overflow-hidden transition-all duration-300",
          isFocused ? "border-primary/50 shadow-primary/10" : "border-white/10"
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask the council..."}
          disabled={disabled}
          rows={1}
          data-testid="input-query"
          className="w-full min-h-[50px] md:min-h-[60px] max-h-[150px] md:max-h-[200px] bg-transparent px-4 py-4 md:px-6 md:py-5 text-base md:text-lg placeholder:text-muted-foreground/50 focus:outline-none resize-none"
        />

        <div className="flex items-center justify-between px-3 pb-3 md:px-4">
          <div className="flex items-center gap-1 md:gap-2 text-muted-foreground/40">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled>
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hidden md:inline-flex" disabled>
              <Mic className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <AnimatePresence>
              {value.trim() && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="text-xs text-muted-foreground font-mono hidden md:inline-block"
                >
                  <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] mr-1">Enter</span> 
                  to send
                </motion.span>
              )}
            </AnimatePresence>

            <Button
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              size="icon"
              data-testid="button-submit"
              className={cn(
                "h-9 w-9 md:h-10 md:w-10 rounded-xl transition-all duration-300",
                value.trim() 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-100" 
                  : "bg-muted text-muted-foreground scale-90 opacity-50"
              )}
            >
              <SendHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
